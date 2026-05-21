import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Permissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { UpdateLiveConfigDto, UpdateJackpotIncrementDto } from "./admin.dto";
import { AdminService } from "./admin.service";

@Controller("admin")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("me")
  @Permissions("admin:access")
  me() {
    return { canAccessAdmin: true };
  }

  @Get("live-config")
  @Permissions("live:manage")
  getLiveConfig() {
    return this.adminService.getLiveConfig();
  }

  @Patch("live-config")
  @Permissions("live:manage")
  updateLiveConfig(@Body() dto: UpdateLiveConfigDto) {
    return this.adminService.updateLiveConfig({
      youtubeVideoId: dto.youtubeVideoId,
      liveOverlayEnabled: dto.liveOverlayEnabled,
    });
  }

  @Get("jackpot-increment")
  @Permissions("draw:manage")
  getJackpotIncrement() {
    return this.adminService.getJackpotIncrement();
  }

  @Patch("jackpot-increment")
  @Permissions("draw:manage")
  updateJackpotIncrement(@Body() dto: UpdateJackpotIncrementDto) {
    return this.adminService.updateJackpotIncrement(dto.amount);
  }
}
