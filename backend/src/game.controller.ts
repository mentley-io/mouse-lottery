import { Body, Controller, Get, Logger, Post, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { CreateEntryDto, PushNumberDto } from "./draws/draws.dto";
import { DrawsService } from "./draws/draws.service";

@Controller("game")
export class GameController {
  private readonly logger = new Logger(GameController.name);

  constructor(private readonly drawsService: DrawsService) {}

  @Get("state")
  async getState() {
    return this.drawsService.getPublicState();
  }

  @UseGuards(JwtAuthGuard)
  @Post("entries")
  async createEntry(
    @Req() req: { user: { sub: string } },
    @Body() dto: CreateEntryDto,
  ) {
    return this.drawsService.createEntry(req.user.sub, dto.numbers);
  }

  @UseGuards(JwtAuthGuard)
  @Get("my-entries")
  async myEntries(@Req() req: { user: { sub: string } }) {
    return this.drawsService.getEntriesForUser(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get("my-wallet-credits")
  async myWalletCredits(@Req() req: { user: { sub: string } }) {
    return this.drawsService.getWalletCreditsForUser(req.user.sub);
  }

  /** External draw machine pushes one number at a time */
  @Post("push")
  async pushNumber(@Req() req: Request, @Body() dto: PushNumberDto) {
    const origin = req.headers.origin ?? "<no-origin>";
    const userAgent = req.headers["user-agent"] ?? "<unknown-ua>";
    const forwardedFor = req.headers["x-forwarded-for"];
    const clientIp =
      typeof forwardedFor === "string"
        ? forwardedFor.split(",")[0].trim()
        : req.ip;

    this.logger.log(
      `POST /game/push origin=${origin} ip=${clientIp} ua=${userAgent} payload=${JSON.stringify(dto)}`,
    );

    return this.drawsService.pushNumber(dto.data.number, dto.data.timestamp, dto.created_at);
  }
}
