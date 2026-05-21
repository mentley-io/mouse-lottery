import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from "class-validator";

export class UpdateLiveConfigDto {
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{6,20}$/)
  youtubeVideoId?: string;

  @IsOptional()
  @IsBoolean()
  liveOverlayEnabled?: boolean;
}

export class UpdateJackpotIncrementDto {
  @IsInt()
  @Min(1)
  amount!: number;
}
