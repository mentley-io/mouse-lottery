import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { UsersService } from "../users/users.service";
import { ExternalLoginDto, LoginDto, RegisterDto } from "./dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const normalizedPhone = this.normalizeKenyaPhone(dto.phone);
    const existing = await this.usersService.findByPhone(normalizedPhone);
    if (existing) {
      throw new UnauthorizedException("Phone already registered");
    }

    const user = await this.usersService.createPlayer(normalizedPhone, dto.password);
    return this.issueTokens(
      user.id,
      user.phone,
      user.role,
      user.permissions,
      user.walletBalanceKES,
      user.walletCurrency,
    );
  }

  async login(dto: LoginDto) {
    const normalizedPhone = this.normalizeKenyaPhone(dto.phone);
    const user = await this.usersService.findByPhone(normalizedPhone);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const valid = await this.usersService.validatePassword(user, dto.password);
    if (!valid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return this.issueTokens(
      user.id,
      user.phone,
      user.role,
      user.permissions,
      user.walletBalanceKES,
      user.walletCurrency,
    );
  }

  async externalLogin(dto: ExternalLoginDto) {
    const externalPhone = this.normalizeExternalPhone(dto.phone);
    const merchant = dto.merchant.trim();
    const token = dto.token.trim();

    let user = await this.usersService.findByPhone(externalPhone);
    if (!user) {
      user = await this.usersService.createExternalPlayer(externalPhone);
    }

    await this.usersService.upsertExternalLoginToken(user.id, merchant, token);

    return this.issueTokens(
      user.id,
      user.phone,
      user.role,
      user.permissions,
      user.walletBalanceKES,
      user.walletCurrency,
    );
  }

  async refresh(refreshToken: string) {
    const payload = await this.jwtService.verifyAsync(refreshToken, {
      secret: this.configService.get<string>("JWT_REFRESH_SECRET") ?? "refresh-secret",
    });

    const user = await this.usersService.findById(payload.sub);
    const walletBalanceKES = user?.walletBalanceKES ?? 0;
    const walletCurrency = user?.walletCurrency ?? "KES";

    return this.issueTokens(
      payload.sub,
      payload.phone,
      payload.role,
      payload.permissions,
      walletBalanceKES,
      walletCurrency,
    );
  }

  private async issueTokens(
    sub: string,
    phone: string,
    role: string,
    permissions: string[],
    walletBalanceKES: number,
    walletCurrency: string,
  ) {
    const payload = { sub, phone, role, permissions };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>("JWT_ACCESS_SECRET") ?? "access-secret",
      expiresIn: this.configService.get<string>("JWT_ACCESS_EXPIRES_IN") ?? "15m",
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>("JWT_REFRESH_SECRET") ?? "refresh-secret",
      expiresIn: this.configService.get<string>("JWT_REFRESH_EXPIRES_IN") ?? "7d",
    });

    return {
      user: { id: sub, phone, role, permissions, walletBalanceKES, walletCurrency },
      accessToken,
      refreshToken,
    };
  }

  private normalizeKenyaPhone(phone: string): string {
    const value = phone.trim();
    if (/^\+254[71]\d{8}$/.test(value)) {
      return value;
    }

    if (/^0[71]\d{8}$/.test(value)) {
      return `+254${value.slice(1)}`;
    }

    throw new UnauthorizedException("Please enter a valid Kenyan mobile number.");
  }

  private normalizeExternalPhone(phone: string): string {
    const value = phone.trim();
    if (!value) {
      throw new UnauthorizedException("Phone is required.");
    }

    return value;
  }
}
