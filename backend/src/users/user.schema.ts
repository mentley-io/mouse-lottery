import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  phone!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ required: true, default: "local", enum: ["local", "external"] })
  authProvider!: "local" | "external";

  @Prop({ required: true, default: true })
  localPasswordEnabled!: boolean;

  @Prop({ default: "player", enum: ["player", "admin", "super_admin"] })
  role!: "player" | "admin" | "super_admin";

  @Prop({ type: [String], default: [] })
  permissions!: string[];

  @Prop({ required: true, default: 0, min: 0 })
  walletBalanceKES!: number;

  @Prop({ required: true, default: "KES" })
  walletCurrency!: string;

  @Prop({ required: false })
  externalMerchant?: string;

  @Prop({ required: false })
  externalToken?: string;

  @Prop({ required: false })
  externalLoggedInAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
