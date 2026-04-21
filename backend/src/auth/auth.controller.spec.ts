import { Test, TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

type MockResponse = {
  cookie: jest.Mock;
  clearCookie: jest.Mock;
};

const createResponse = (): MockResponse => ({
  cookie: jest.fn(),
  clearCookie: jest.fn(),
});

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    register: jest.Mock;
    login: jest.Mock;
    refreshSession: jest.Mock;
  };

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      refreshSession: jest.fn(),
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
    authService.login.mockResolvedValue({
      user: {
        sub: 'user-id',
        email: 'user@example.com',
      },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      csrfToken: 'csrf-token',
    });

    const response = createResponse();

    const dto = {
      email: 'user@example.com',
      password: 'password123',
    };

    const result = await controller.login(dto, response as unknown as Response);

    expect(authService.login).toHaveBeenCalledWith(dto);
    expect(response.cookie).toHaveBeenCalledTimes(3);
    expect(result).toEqual({
      user: {
        sub: 'user-id',
        email: 'user@example.com',
      },
    });
  });

  it('refresh delegates to authService.refreshSession', async () => {
    authService.refreshSession.mockResolvedValue({
      user: {
        sub: 'user-id',
        email: 'user@example.com',
      },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      csrfToken: 'csrf-token',
    });

    const request = {
      headers: {
        cookie: 'refresh_token=refresh-token',
      },
    };
    const response = createResponse();

    const result = await controller.refresh(
      request as unknown as Request,
      response as unknown as Response,
    );

    expect(authService.refreshSession).toHaveBeenCalledWith('refresh-token');
    expect(response.cookie).toHaveBeenCalledTimes(3);
    expect(result).toEqual({
      user: {
        sub: 'user-id',
        email: 'user@example.com',
      },
    });
  });

  it('logout clears auth cookies', () => {
    const response = createResponse();

    expect(controller.logout(response as unknown as Response)).toEqual({
      success: true,
    });
    expect(response.clearCookie).toHaveBeenCalledTimes(3);
  });

  it('me returns request.user payload', () => {
    const request = {
      user: {
        sub: 'user-id',
        email: 'user@example.com',
      },
    };

    // Endpoint should echo JWT context already attached by guard/strategy.
    expect(controller.me(request)).toEqual(request.user);
  });
});
