import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: { register: jest.Mock; login: jest.Mock };

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('register delegates to authService.register', async () => {
    authService.register.mockResolvedValue({ id: 'user-id' });

    const dto = {
      email: 'user@example.com',
      password: 'password123',
      name: 'User',
    };

    await controller.register(dto);

    expect(authService.register).toHaveBeenCalledWith(dto);
  });

  it('login delegates to authService.login', async () => {
    authService.login.mockResolvedValue({ accessToken: 'token' });

    const dto = {
      email: 'user@example.com',
      password: 'password123',
    };

    await controller.login(dto);

    expect(authService.login).toHaveBeenCalledWith(dto);
  });

  it('me returns request.user payload', () => {
    const request = {
      user: {
        sub: 'user-id',
        email: 'user@example.com',
      },
    };

    expect(controller.me(request)).toEqual(request.user);
  });
});
