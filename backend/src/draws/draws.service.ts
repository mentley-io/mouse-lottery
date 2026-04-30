import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { AdminService } from "../admin/admin.service";
import { DrawnNumber, DrawnNumberDocument } from "./drawn-number.schema";
import { Entry, EntryDocument, EntryStatus } from "./entry.schema";

function toUtcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function endOfUtcDay(date: Date): Date {
  return new Date(date.toISOString().slice(0, 10) + "T23:59:59.999Z");
}

@Injectable()
export class DrawsService {
  private readonly logger = new Logger(DrawsService.name);

  constructor(
    @InjectModel(DrawnNumber.name) private readonly drawnNumberModel: Model<DrawnNumberDocument>,
    @InjectModel(Entry.name) private readonly entryModel: Model<EntryDocument>,
    private readonly adminService: AdminService,
  ) {}

  async getPublicState() {
    await this.expireOldEntries(new Date());

    const runtimeConfig = await this.adminService.getGameRuntimeConfig();
    const today = toUtcDayKey(new Date());
    const todayNumbers = await this.drawnNumberModel
      .find({ dayKey: today })
      .sort({ receivedAt: 1 })
      .lean();
    const last20 = todayNumbers.slice(-20);
    const historyByDay = await this.drawnNumberModel.aggregate<{
      _id: string;
      numbers: number[];
      total: number;
      lastReceivedAt: Date;
    }>([
      { $sort: { receivedAt: 1 } },
      {
        $group: {
          _id: "$dayKey",
          numbers: { $push: "$number" },
          total: { $sum: 1 },
          lastReceivedAt: { $last: "$receivedAt" },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 20 },
    ]);

    return {
      youtubeVideoId: runtimeConfig.youtubeVideoId,
      jackpot: { amount: 12345678, currency: "KES" },
      draw: {
        stream: last20.map((d) => ({ number: d.number, receivedAt: d.receivedAt })),
        totalToday: todayNumbers.length,
        dayKey: today,
        history: historyByDay.map((item) => ({
          dayKey: item._id,
          numbers: item.numbers,
          total: item.total,
          lastReceivedAt: item.lastReceivedAt,
        })),
      },
      resultPolicy: {
        nonWinningTerminalStatus: "Expired",
        payoutRemainderPolicy: "platform_retained",
        realtimeMode: runtimeConfig.realtimeMode,
        pollingIntervalSeconds: runtimeConfig.pollingIntervalSeconds,
        liveOverlayEnabled: runtimeConfig.liveOverlayEnabled,
        otpEnabled: false,
      },
      updatedAt: new Date().toISOString(),
    };
  }

  async pushNumber(number: number, timestamp: string, createdAtMs?: number) {
    if (!Number.isInteger(number) || number < 0 || number > 9) {
      throw new BadRequestException("Number must be an integer 0–9.");
    }
    const receivedAt = Number.isFinite(createdAtMs)
      ? new Date(createdAtMs as number)
      : (timestamp ? new Date(timestamp) : new Date());
    if (isNaN(receivedAt.getTime())) {
      throw new BadRequestException("Invalid Timestamp format.");
    }
    const dayKey = toUtcDayKey(receivedAt);
    const saved = await this.drawnNumberModel.create({ number, receivedAt, dayKey });
    this.logger.log(`Pushed ${number} at ${receivedAt.toISOString()} (day=${dayKey})`);
    await this.expireOldEntries(receivedAt);
    await this.settleEntries(receivedAt);
    return { id: saved._id.toString(), number, receivedAt: saved.receivedAt, dayKey };
  }

  async createEntry(userId: string, numbers: number[]) {
    if (!Array.isArray(numbers) || numbers.length !== 4) {
      throw new BadRequestException("Please provide exactly 4 numbers.");
    }
    const now = new Date();
    const validFrom = new Date(now.getTime() + 5 * 60 * 1000);
    const expiresAt = endOfUtcDay(now);

    await this.entryModel.updateMany(
      { userId: new Types.ObjectId(userId), status: "Pending" },
      { $set: { status: "Voided", settledAt: new Date() } },
    );

    const entry = await this.entryModel.create({
      userId: new Types.ObjectId(userId),
      numbers,
      placedAt: now,
      validFrom,
      expiresAt,
      status: "Pending" as EntryStatus,
    });

    return {
      id: entry._id.toString(),
      numbers: entry.numbers,
      status: entry.status,
      placedAt: entry.placedAt.toISOString(),
      validFrom: entry.validFrom.toISOString(),
      expiresAt: entry.expiresAt.toISOString(),
    };
  }

  async getEntriesForUser(userId: string) {
    await this.expireOldEntries(new Date());

    const entries = await this.entryModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return entries.map((entry) => ({
      id: entry._id.toString(),
      numbers: entry.numbers,
      status: entry.status,
      placedAt: entry.placedAt.toISOString(),
      validFrom: entry.validFrom.toISOString(),
      expiresAt: entry.expiresAt.toISOString(),
      settledAt: entry.settledAt?.toISOString() ?? null,
      winningSequenceEndedAt: entry.winningSequenceEndedAt?.toISOString() ?? null,
      createdAt: (entry as unknown as { createdAt?: Date }).createdAt?.toISOString() ?? null,
    }));
  }

  private async settleEntries(asOf: Date) {
    const candidates = await this.entryModel.find({
      status: "Pending",
      validFrom: { $lte: asOf },
      expiresAt: { $gte: asOf },
    });
    if (candidates.length === 0) return;

    const minValidFrom = candidates.reduce((min, entry) => {
      return entry.validFrom < min ? entry.validFrom : min;
    }, candidates[0].validFrom);

    const allNumbers = await this.drawnNumberModel
      .find({
        receivedAt: {
          $gte: minValidFrom,
          $lte: asOf,
        },
      })
      .sort({ receivedAt: 1 })
      .lean();

    for (const entry of candidates) {
      const entryValidFrom = new Date(entry.validFrom);
      const entryExpiresAt = new Date(entry.expiresAt);
      const eligible = allNumbers.filter((d) => {
        const t = new Date(d.receivedAt);
        return t >= entryValidFrom && t <= entryExpiresAt;
      });

      const seq = eligible.map((d) => d.number);
      if (this.containsConsecutive(seq, entry.numbers)) {
        const matchedAt = this.findMatchEndTime(eligible, entry.numbers);
        await this.entryModel.updateOne(
          { _id: entry._id, status: "Pending" },
          { $set: { status: "Won", settledAt: new Date(), winningSequenceEndedAt: matchedAt } },
        );
        this.logger.log(`Entry ${entry._id.toString()} WON: ${entry.numbers.join("")}`);
      }
    }
  }

  private async expireOldEntries(asOf: Date) {
    await this.entryModel.updateMany(
      { status: "Pending", expiresAt: { $lt: asOf } },
      { $set: { status: "Expired", settledAt: new Date() } },
    );
  }

  private containsConsecutive(haystack: number[], needle: number[]): boolean {
    if (needle.length > haystack.length) return false;
    for (let i = 0; i <= haystack.length - needle.length; i++) {
      if (needle.every((v, j) => haystack[i + j] === v)) return true;
    }
    return false;
  }

  private findMatchEndTime(
    eligible: { number: number; receivedAt: Date }[],
    needle: number[],
  ): Date | undefined {
    for (let i = 0; i <= eligible.length - needle.length; i++) {
      if (needle.every((v, j) => eligible[i + j].number === v)) {
        return eligible[i + needle.length - 1].receivedAt;
      }
    }
    return undefined;
  }
}
