import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AssistantQuestionDto } from './dto/assistant-question.dto';
import { AssistantService } from './assistant.service';

@ApiTags('assistant')
@Controller('assistant')
export class AssistantController {
  constructor(private readonly assistantService: AssistantService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('questions')
  @ApiOperation({ summary: 'Answer a read-only question about user events' })
  @ApiResponse({ status: 200, description: 'Assistant answer' })
  answerQuestion(
    @Body() dto: AssistantQuestionDto,
    @CurrentUser() user: { sub: string; email: string },
  ): Promise<{ answer: string }> {
    return this.assistantService.answerQuestion(dto.question, user.sub);
  }
}
