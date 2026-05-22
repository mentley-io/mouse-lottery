import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Entry, EntryDocument } from "../draws/entry.schema";
import { PayoutRecord, PayoutRecordDocument } from "../draws/payout-record.schema";
import { User, UserDocument } from "../users/user.schema";
import { WinnersQueryDto } from "./admin.dto";
import { AdminConfig, AdminConfigDocument } from "./admin-config.schema";

type WinnerRow = {
  payoutId: string;
  entryId: string;
  userId: string;
  phone: string;
  winningNumber: string;
  winningTime: string | null;
  settledAt: string;
  payoutKES: number;
  jackpotBeforeSplitKES: number;
  winnerCount: number;
  settlementKey: string;
};

type AggregatedWinner = {
  _id: unknown;
  entryId: unknown;
  userId: unknown;
  phone?: string;
  numbers?: number[];
  winningSequenceEndedAt?: Date;
  settledAt: Date;
  payoutKES: number;
  jackpotBeforeSplitKES: number;
  winnerCount: number;
  settlementKey: string;
};

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

@Injectable()
export class AdminService implements OnModuleInit {
  private readonly logger = new Logger(AdminService.name);
  private readonly configKey = "runtime";
  private readonly defaultConfig = {
    youtubeVideoId: "dQw4w9WgXcQ",
    liveOverlayEnabled: false,
    realtimeMode: "polling",
    pollingIntervalSeconds: 5,
    jackpotIncrementAmount: 10,
  };
  private config = { ...this.defaultConfig };
  private loaded = false;

  constructor(
    @InjectModel(AdminConfig.name)
    private readonly adminConfigModel: Model<AdminConfigDocument>,
    @InjectModel(PayoutRecord.name)
    private readonly payoutRecordModel: Model<PayoutRecordDocument>,
    @InjectModel(Entry.name)
    private readonly entryModel: Model<EntryDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async onModuleInit() {
    await this.ensureConfigLoaded();
  }

  private async ensureConfigLoaded() {
    if (this.loaded) {
      return;
    }

    const existing = await this.adminConfigModel.findOne({ key: this.configKey }).lean();
    if (!existing) {
      await this.adminConfigModel.create({ key: this.configKey, ...this.defaultConfig });
      this.config = { ...this.defaultConfig };
      this.loaded = true;
      return;
    }

    this.config = {
      youtubeVideoId: existing.youtubeVideoId ?? this.defaultConfig.youtubeVideoId,
      liveOverlayEnabled: existing.liveOverlayEnabled ?? this.defaultConfig.liveOverlayEnabled,
      realtimeMode: existing.realtimeMode ?? this.defaultConfig.realtimeMode,
      pollingIntervalSeconds: existing.pollingIntervalSeconds ?? this.defaultConfig.pollingIntervalSeconds,
      jackpotIncrementAmount: existing.jackpotIncrementAmount ?? this.defaultConfig.jackpotIncrementAmount,
    };
    this.loaded = true;
  }

  private async persistConfig() {
    const updated = await this.adminConfigModel.findOneAndUpdate(
      { key: this.configKey },
      { $set: this.config },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    ).lean();

    if (!updated) {
      this.logger.warn("Admin config persistence returned no document.");
      return;
    }

    this.config = {
      youtubeVideoId: updated.youtubeVideoId ?? this.defaultConfig.youtubeVideoId,
      liveOverlayEnabled: updated.liveOverlayEnabled ?? this.defaultConfig.liveOverlayEnabled,
      realtimeMode: updated.realtimeMode ?? this.defaultConfig.realtimeMode,
      pollingIntervalSeconds: updated.pollingIntervalSeconds ?? this.defaultConfig.pollingIntervalSeconds,
      jackpotIncrementAmount: updated.jackpotIncrementAmount ?? this.defaultConfig.jackpotIncrementAmount,
    };
  }

  async getLiveConfig() {
    await this.ensureConfigLoaded();
    return {
      youtubeVideoId: this.config.youtubeVideoId,
      liveOverlayEnabled: this.config.liveOverlayEnabled,
      realtimeMode: this.config.realtimeMode,
      pollingIntervalSeconds: this.config.pollingIntervalSeconds,
    };
  }

  async updateLiveConfig(params: {
    youtubeVideoId?: string;
    liveOverlayEnabled?: boolean;
  }) {
    await this.ensureConfigLoaded();

    if (typeof params.youtubeVideoId === "string" && params.youtubeVideoId.trim().length > 0) {
      this.config.youtubeVideoId = params.youtubeVideoId;
    }

    if (typeof params.liveOverlayEnabled === "boolean") {
      this.config.liveOverlayEnabled = params.liveOverlayEnabled;
    }

    await this.persistConfig();
    return this.getLiveConfig();
  }

  async getGameRuntimeConfig() {
    await this.ensureConfigLoaded();
    return {
      youtubeVideoId: this.config.youtubeVideoId,
      liveOverlayEnabled: this.config.liveOverlayEnabled,
      realtimeMode: this.config.realtimeMode,
      pollingIntervalSeconds: this.config.pollingIntervalSeconds,
      jackpotIncrementAmount: this.config.jackpotIncrementAmount,
    };
  }

  async getJackpotIncrement() {
    await this.ensureConfigLoaded();
    return { jackpotIncrementAmount: this.config.jackpotIncrementAmount };
  }

  async updateJackpotIncrement(amount: number) {
    await this.ensureConfigLoaded();
    this.config.jackpotIncrementAmount = amount;
    await this.persistConfig();
  }

  async getWinners(query: WinnersQueryDto) {
    const limit = query.limit ?? 200;
    const offset = query.offset ?? 0;
    const dateFilter = this.buildSettledAtFilter(query);
    const matchStage = dateFilter ? { settledAt: dateFilter } : {};

    const [aggregated] = await this.payoutRecordModel.aggregate<{
      meta: Array<{ total: number }>;
      items: AggregatedWinner[];
    }>([
      { $match: matchStage },
      { $sort: { settledAt: -1, _id: -1 } },
      {
        $facet: {
          meta: [{ $count: "total" }],
          items: [
            { $skip: offset },
            { $limit: limit },
            {
              $lookup: {
                from: this.entryModel.collection.name,
                localField: "entryId",
                foreignField: "_id",
                as: "entry",
              },
            },
            { $unwind: { path: "$entry", preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: this.userModel.collection.name,
                localField: "userId",
                foreignField: "_id",
                as: "user",
              },
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            {
              $project: {
                _id: 1,
                entryId: 1,
                userId: 1,
                settledAt: 1,
                payoutKES: 1,
                jackpotBeforeSplitKES: 1,
                winnerCount: 1,
                settlementKey: 1,
                phone: "$user.phone",
                numbers: "$entry.numbers",
                winningSequenceEndedAt: "$entry.winningSequenceEndedAt",
              },
            },
          ],
        },
      },
    ]);

    const total = aggregated?.meta?.[0]?.total ?? 0;
    const items = (aggregated?.items ?? []).map((item) => this.toWinnerRow(item));

    return {
      total,
      limit,
      offset,
      items,
    };
  }

  async buildWinnersCsv(query: WinnersQueryDto): Promise<string> {
    const dateFilter = this.buildSettledAtFilter(query);
    const matchStage = dateFilter ? { settledAt: dateFilter } : {};

    const rows = await this.payoutRecordModel.aggregate<AggregatedWinner>([
      { $match: matchStage },
      { $sort: { settledAt: -1, _id: -1 } },
      {
        $lookup: {
          from: this.entryModel.collection.name,
          localField: "entryId",
          foreignField: "_id",
          as: "entry",
        },
      },
      { $unwind: { path: "$entry", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: this.userModel.collection.name,
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          entryId: 1,
          userId: 1,
          settledAt: 1,
          payoutKES: 1,
          jackpotBeforeSplitKES: 1,
          winnerCount: 1,
          settlementKey: 1,
          phone: "$user.phone",
          numbers: "$entry.numbers",
          winningSequenceEndedAt: "$entry.winningSequenceEndedAt",
        },
      },
    ]);

    const header = [
      "phone",
      "winningNumber",
      "winningTime",
      "payoutKES",
      "jackpotBeforeSplitKES",
      "winnerCount",
      "settlementKey",
      "settledAt",
      "entryId",
      "userId",
    ];

    const lines = [header.join(",")];

    for (const row of rows.map((item) => this.toWinnerRow(item))) {
      lines.push([
        row.phone,
        row.winningNumber,
        row.winningTime ?? "",
        String(row.payoutKES),
        String(row.jackpotBeforeSplitKES),
        String(row.winnerCount),
        row.settlementKey,
        row.settledAt,
        row.entryId,
        row.userId,
      ].map(escapeCsvField).join(","));
    }

    return lines.join("\n");
  }

  private buildSettledAtFilter(query: WinnersQueryDto): { $gte?: Date; $lte?: Date } | null {
    const from = query.from ? new Date(query.from) : null;
    const to = query.to ? new Date(query.to) : null;

    if (!from && !to) {
      return null;
    }

    const filter: { $gte?: Date; $lte?: Date } = {};
    if (from) {
      filter.$gte = from;
    }
    if (to) {
      filter.$lte = to;
    }
    return filter;
  }

  private toWinnerRow(item: AggregatedWinner): WinnerRow {
    const winningNumber = Array.isArray(item.numbers)
      ? item.numbers.map((value) => String(value)).join("")
      : "";

    return {
      payoutId: String(item._id),
      entryId: String(item.entryId),
      userId: String(item.userId),
      phone: item.phone ?? "",
      winningNumber,
      winningTime: item.winningSequenceEndedAt ? item.winningSequenceEndedAt.toISOString() : null,
      settledAt: item.settledAt.toISOString(),
      payoutKES: item.payoutKES,
      jackpotBeforeSplitKES: item.jackpotBeforeSplitKES,
      winnerCount: item.winnerCount,
      settlementKey: item.settlementKey,
    };
  }
}
