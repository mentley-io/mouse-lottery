import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AdminModule } from "../admin/admin.module";
import { DrawnNumber, DrawnNumberSchema } from "./drawn-number.schema";
import { DrawsService } from "./draws.service";
import { Entry, EntrySchema } from "./entry.schema";

@Module({
  imports: [
    AdminModule,
    MongooseModule.forFeature([
      { name: DrawnNumber.name, schema: DrawnNumberSchema },
      { name: Entry.name, schema: EntrySchema },
    ]),
  ],
  providers: [DrawsService],
  exports: [DrawsService],
})
export class DrawsModule {}
