import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class AssistantQuestionDto {
  @ApiProperty({
    example: 'How many events do I have next week with tag tech?',
    description: 'Natural-language question about the current user events.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  question!: string;
}
