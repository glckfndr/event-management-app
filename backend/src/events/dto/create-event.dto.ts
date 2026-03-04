import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateEventDto {
  @ApiProperty({ example: 'NestJS Meetup' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ example: 'Talks and networking about NestJS' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '2026-05-01T12:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  eventDate!: string;

  @ApiProperty({ example: 'Kyiv' })
  @IsString()
  @IsNotEmpty()
  location!: string;

  @ApiProperty({ example: 50, default: 1 })
  @IsInt()
  @Min(1)
  capacity!: number;
}
