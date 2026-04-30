import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { AdminModule } from "./admin/admin.module";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { DrawsModule } from "./draws/draws.module";
import { GameController } from "./game.controller";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri:
          configService.get<string>("MONGODB_URI") ??
          "mongodb://localhost:27017/mouse_lottery?authSource=admin",
      }),
    }),
    UsersModule,
    AuthModule,
    AdminModule,
    DrawsModule,
  ],
  controllers: [AppController, GameController],
})
export class AppModule {}
