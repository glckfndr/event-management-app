import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';

export class AssistantQuestionDto {
  @ApiProperty({
    example: 'How many events do I have next week with tag tech?',
    description: 'Natural-language question about the current user events.',
  })
  @IsString()
  @Matches(/\S/, {
    message: 'Question must contain at least one non-whitespace character',
  })
  @MaxLength(500)
  question!: string;
}
