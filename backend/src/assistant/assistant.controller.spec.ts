import { Test, TestingModule } from '@nestjs/testing';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';

describe('AssistantController', () => {
  let controller: AssistantController;
  let assistantService: { answerQuestion: jest.Mock };

  beforeEach(async () => {
    assistantService = {
      answerQuestion: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssistantController],
      providers: [
        {
          provide: AssistantService,
          useValue: assistantService,
        },
      ],
    }).compile();

    controller = module.get<AssistantController>(AssistantController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('forwards question to service with current user id', async () => {
    assistantService.answerQuestion.mockResolvedValue({ answer: 'ok' });

    // Controller must pass authenticated user id, not any value from payload.
    await controller.answerQuestion(
      { question: 'How many events?' },
      { sub: 'user-id', email: 'user@example.com' },
    );

    expect(assistantService.answerQuestion).toHaveBeenCalledWith(
      'How many events?',
      'user-id',
    );
  });
});
