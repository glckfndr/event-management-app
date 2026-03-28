import { validate } from 'class-validator';
import { AssistantQuestionDto } from './assistant-question.dto';

describe('AssistantQuestionDto', () => {
  it('accepts a non-empty question with non-whitespace characters', async () => {
    const dto = new AssistantQuestionDto();
    dto.question = 'How many events do I have?';

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects question containing only whitespace', async () => {
    const dto = new AssistantQuestionDto();
    dto.question = '   \t\n  ';

    const errors = await validate(dto);

    // Regex validation should reject blank prompts after trim-like whitespace.
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints).toHaveProperty('matches');
  });
});
