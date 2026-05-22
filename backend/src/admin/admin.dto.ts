import {
  IsDateString,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Matches,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

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

export class WinnersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5000)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
