import { Body, Controller, Get, Logger, Post, Req, UseGuards } from "@nestjs/common";
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

  /** External draw machine pushes one number at a time */
  @Post("push")
  async pushNumber(@Body() dto: PushNumberDto) {
    this.logger.log(`POST /game/push payload: ${JSON.stringify(dto)}`);
    return this.drawsService.pushNumber(dto.data.number, dto.data.timestamp, dto.created_at);
  }
}
