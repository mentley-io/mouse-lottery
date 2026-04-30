import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type AdminConfigDocument = HydratedDocument<AdminConfig>;

@Schema({ timestamps: true, collection: "admin_configs" })
export class AdminConfig {
  @Prop({ required: true, unique: true, default: "runtime" })
  key!: string;

  @Prop({ required: true, default: 300 })
  drawIntervalSeconds!: number;

  @Prop({ required: true, default: "dQw4w9WgXcQ" })
  youtubeVideoId!: string;

  @Prop({ required: true, default: false })
  liveOverlayEnabled!: boolean;

  @Prop({ required: true, default: "polling" })
  realtimeMode!: string;

  @Prop({ required: true, default: 5 })
  pollingIntervalSeconds!: number;
}

export const AdminConfigSchema = SchemaFactory.createForClass(AdminConfig);