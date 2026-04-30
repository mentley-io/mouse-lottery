import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Permissions } from "../auth/permissions.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { UpdateDrawIntervalDto, UpdateLiveConfigDto } from "./admin.dto";
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

  @Get("draw-interval")
  @Permissions("draw:manage")
  getDrawInterval() {
    return this.adminService.getDrawInterval();
  }

  @Patch("draw-interval")
  @Permissions("draw:manage")
  updateDrawInterval(@Body() dto: UpdateDrawIntervalDto) {
    return this.adminService.updateDrawInterval(dto.seconds);
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
}
