import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  phone!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ default: "player", enum: ["player", "admin", "super_admin"] })
  role!: "player" | "admin" | "super_admin";

  @Prop({ type: [String], default: [] })
  permissions!: string[];
}

export const UserSchema = SchemaFactory.createForClass(User);
