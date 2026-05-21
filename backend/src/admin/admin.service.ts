import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { AdminConfig, AdminConfigDocument } from "./admin-config.schema";

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
}
