import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class FindEventsQueryDto {
  @ApiPropertyOptional({
    description:
      'Filter by tag names (comma-separated). Matches events containing any of the selected tags.',
    example: 'Tech,Art',
  })
  @IsOptional()
  @IsString()
  tags?: string;
}
