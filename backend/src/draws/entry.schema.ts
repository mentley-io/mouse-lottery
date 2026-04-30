import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type EntryDocument = HydratedDocument<Entry>;

export type EntryStatus = "Pending" | "Won" | "Expired" | "Voided";

@Schema({ timestamps: true })
export class Entry {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: [Number], required: true })
  numbers!: number[];

  /** When the bet was placed */
  @Prop({ required: true, index: true })
  placedAt!: Date;

  /** Numbers pushed before this time don't count (placedAt + 5 min) */
  @Prop({ required: true })
  validFrom!: Date;

  /** Bet expires at 23:59:59 of the day it was placed */
  @Prop({ required: true, index: true })
  expiresAt!: Date;

  @Prop({ required: true, enum: ["Pending", "Won", "Expired", "Voided"], default: "Pending", index: true })
  status!: EntryStatus;

  @Prop({ required: false })
  settledAt?: Date;

  @Prop({ required: false })
  winningSequenceEndedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const EntrySchema = SchemaFactory.createForClass(Entry);
