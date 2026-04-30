import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
} from "class-validator";

export class UpdateDrawIntervalDto {
  @IsInt()
  @Min(10)
  seconds!: number;
}

export class UpdateLiveConfigDto {
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z0-9_-]{6,20}$/)
  youtubeVideoId?: string;

  @IsOptional()
  @IsBoolean()
  liveOverlayEnabled?: boolean;
}
