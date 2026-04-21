import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { hash, compare } from 'bcrypt';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    findByEmail: jest.Mock;
    findByEmailWithPassword: jest.Mock;
    createUser: jest.Mock;
  };
  let jwtService: { signAsync: jest.Mock; verifyAsync: jest.Mock };

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      createUser: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('register throws ConflictException when email already exists', async () => {
    usersService.findByEmail.mockResolvedValue({ id: 'existing-user' });

    await expect(
      service.register({
        email: 'user@example.com',
        password: 'password123',
        name: 'User',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('register creates user and returns safe payload', async () => {
    const createdAt = new Date();

    usersService.findByEmail.mockResolvedValue(null);
    usersService.createUser.mockResolvedValue({
      id: 'user-id',
      email: 'user@example.com',
      name: 'User',
      createdAt,
    });

    (hash as jest.Mock).mockResolvedValue('hashed-password');

    const result = await service.register({
      email: 'user@example.com',
      password: 'password123',
      name: 'User',
    });

    expect(hash).toHaveBeenCalledWith('password123', 10);
    expect(usersService.createUser).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'hashed-password',
      name: 'User',
    });
    // Returned payload excludes hashed password.
    expect(result).toEqual({
      id: 'user-id',
      email: 'user@example.com',
      name: 'User',
      createdAt,
    });
  });

  it('login throws UnauthorizedException when user is not found', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue(null);

    await expect(
      service.login({ email: 'missing@example.com', password: 'password123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('login throws UnauthorizedException when password is invalid', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue({
      id: 'user-id',
      email: 'user@example.com',
      password: 'hashed-password',
    });

    (compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login({ email: 'user@example.com', password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(compare).toHaveBeenCalledWith('wrong-password', 'hashed-password');
  });

  it('login returns session payload for valid credentials', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue({
      id: 'user-id',
      email: 'user@example.com',
      password: 'hashed-password',
    });

    (compare as jest.Mock).mockResolvedValue(true);
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    const result = await service.login({
      email: 'user@example.com',
      password: 'password123',
    });

    expect(jwtService.signAsync).toHaveBeenNthCalledWith(1, {
      sub: 'user-id',
      email: 'user@example.com',
    });
    expect(jwtService.signAsync).toHaveBeenNthCalledWith(
      2,
      {
        sub: 'user-id',
        email: 'user@example.com',
      },
      expect.objectContaining({
        secret: expect.any(String),
        expiresIn: expect.any(String),
      }),
    );
    expect(result).toEqual({
      user: {
        sub: 'user-id',
        email: 'user@example.com',
      },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      csrfToken: expect.any(String),
    });
  });

  it('refreshSession reissues tokens for valid refresh token', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-id',
      email: 'user@example.com',
    });
    usersService.findByEmail.mockResolvedValue({
      id: 'user-id',
      email: 'user@example.com',
    });
    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    const result = await service.refreshSession('refresh-token');

    expect(jwtService.verifyAsync).toHaveBeenCalledWith(
      'refresh-token',
      expect.objectContaining({ secret: expect.any(String) }),
    );
    expect(result).toEqual({
      user: {
        sub: 'user-id',
        email: 'user@example.com',
      },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      csrfToken: expect.any(String),
    });
  });

  it('refreshSession throws UnauthorizedException for invalid token', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid token'));

    await expect(service.refreshSession('bad-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('refreshSession throws UnauthorizedException when user is missing', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-id',
      email: 'user@example.com',
    });
    usersService.findByEmail.mockResolvedValue(null);

    await expect(
      service.refreshSession('refresh-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
