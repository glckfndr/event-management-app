import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { EventVisibility } from '../entities/event.entity';

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

  @ApiPropertyOptional({
    example: 50,
    description:
      'Maximum number of participants. If omitted, capacity is unlimited.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({
    enum: EventVisibility,
    default: EventVisibility.PUBLIC,
    description: 'Event visibility. Public events are shown in public listing.',
  })
  @IsOptional()
  @IsEnum(EventVisibility)
  visibility?: EventVisibility;

  @ApiPropertyOptional({
    type: [String],
    example: ['Tech', 'Art'],
    description: 'Optional event tags. Maximum 5 tags.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  tags?: string[];
}
