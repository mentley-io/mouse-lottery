import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as bcrypt from "bcryptjs";
import { User, UserDocument } from "./user.schema";

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const strictMode =
      (this.configService.get<string>("BOOTSTRAP_STRICT_MODE") ?? "false") === "true";

    try {
      await this.ensureSuperAdmin();
    } catch (error) {
      if (strictMode) {
        throw error;
      }

      // In lax mode, backend startup continues even if bootstrap checks fail.
      console.warn("[UsersService] Super admin bootstrap skipped:", error);
    }
  }

  async ensureSuperAdmin(): Promise<void> {
    const exists = await this.userModel.findOne({ role: "super_admin" }).lean();
    if (exists) {
      return;
    }

    const phone = this.configService.get<string>("SUPER_ADMIN_PHONE") ?? "+254700000001";
    const password = this.configService.get<string>("SUPER_ADMIN_PASSWORD") ?? "ChangeMe123!";

    const passwordHash = await bcrypt.hash(password, 10);

    await this.userModel.create({
      phone,
      passwordHash,
      role: "super_admin",
      permissions: ["admin:access", "draw:manage", "live:manage", "users:read"],
    });
  }

  async findByPhone(phone: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ phone });
  }

  async createPlayer(phone: string, password: string): Promise<UserDocument> {
    const passwordHash = await bcrypt.hash(password, 10);
    return this.userModel.create({
      phone,
      passwordHash,
      role: "player",
      permissions: [],
    });
  }

  async validatePassword(user: UserDocument, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }
}
