import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { AuthService } from "./auth.service";
import { ExternalLoginDto, LoginDto, RefreshDto, RegisterDto } from "./dto";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post("external-login")
  externalLogin(@Body() dto: ExternalLoginDto) {
    return this.authService.externalLogin(dto);
  }

  @Post("refresh")
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async me(@Req() req: { user: { sub: string; phone: string; role: string; permissions: string[] } }) {
    const { sub, phone, role, permissions } = req.user;
    const user = await this.usersService.findById(sub);

    return {
      id: sub,
      phone,
      role,
      permissions,
      canAccessAdmin: permissions.includes("admin:access"),
      walletBalanceKES: user?.walletBalanceKES ?? 0,
      walletCurrency: user?.walletCurrency ?? "KES",
    };
  }
}
