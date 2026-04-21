import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { JwtStrategy } from '../src/auth/jwt.strategy';
import { resolveJwtSecret } from '../src/auth/jwt.config';
import {
  ACCESS_TOKEN_COOKIE_NAME,
  CSRF_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
} from '../src/auth/auth-cookie.helpers';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let authService: {
    register: jest.Mock;
    login: jest.Mock;
    refreshSession: jest.Mock;
  };

  beforeAll(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      refreshSession: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: resolveJwtSecret(),
        }),
      ],
      controllers: [AuthController],
      providers: [
        JwtStrategy,
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get(JwtService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    authService.register.mockReset();
    authService.login.mockReset();
    authService.refreshSession.mockReset();
  });

  it('/auth/me (GET) returns 401 without token', () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    return request(httpServer).get('/auth/me').expect(401);
  });

  it('/auth/me (GET) returns payload with valid bearer token', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const token = await jwtService.signAsync({
      sub: 'user-id',
      email: 'user@example.com',
    });

    const response = await request(httpServer)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        sub: 'user-id',
        email: 'user@example.com',
      }),
    );
  });

  it('/auth/me (GET) returns payload with valid access cookie', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const token = await jwtService.signAsync({
      sub: 'user-id',
      email: 'user@example.com',
    });

    const response = await request(httpServer)
      .get('/auth/me')
      .set('Cookie', [`${ACCESS_TOKEN_COOKIE_NAME}=${token}`])
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        sub: 'user-id',
        email: 'user@example.com',
      }),
    );
  });

  it('register -> login -> me happy-path', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    authService.register.mockResolvedValue({
      id: 'user-id',
      email: 'user@example.com',
      name: 'User',
      createdAt: new Date('2026-03-03T00:00:00.000Z'),
    });

    const token = await jwtService.signAsync({
      sub: 'user-id',
      email: 'user@example.com',
    });

    authService.login.mockResolvedValue({
      user: {
        sub: 'user-id',
        email: 'user@example.com',
      },
      accessToken: token,
      refreshToken: 'refresh-token',
      csrfToken: 'csrf-token',
    });

    await request(httpServer)
      .post('/auth/register')
      .send({
        email: 'user@example.com',
        password: 'password123',
        name: 'User',
      })
      .expect(201);

    const loginResponse = await request(httpServer)
      .post('/auth/login')
      .send({
        email: 'user@example.com',
        password: 'password123',
      })
      .expect(200);

    expect(loginResponse.body).toEqual({
      user: {
        sub: 'user-id',
        email: 'user@example.com',
      },
    });
    expect(loginResponse.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`${ACCESS_TOKEN_COOKIE_NAME}=`),
        expect.stringContaining(`${REFRESH_TOKEN_COOKIE_NAME}=`),
        expect.stringContaining(`${CSRF_TOKEN_COOKIE_NAME}=`),
      ]),
    );

    const meResponse = await request(httpServer)
      .get('/auth/me')
      .set('Cookie', [`${ACCESS_TOKEN_COOKIE_NAME}=${token}`])
      .expect(200);

    expect(authService.register).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
      name: 'User',
    });
    expect(authService.login).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
    });
    expect(meResponse.body).toEqual(
      expect.objectContaining({
        sub: 'user-id',
        email: 'user@example.com',
      }),
    );
  });

  it('/auth/refresh (POST) rotates cookies and returns user', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    authService.refreshSession.mockResolvedValue({
      user: {
        sub: 'user-id',
        email: 'user@example.com',
      },
      accessToken: 'next-access-token',
      refreshToken: 'next-refresh-token',
      csrfToken: 'next-csrf-token',
    });

    const response = await request(httpServer)
      .post('/auth/refresh')
      .set('Cookie', [`${REFRESH_TOKEN_COOKIE_NAME}=refresh-token`])
      .expect(200);

    expect(authService.refreshSession).toHaveBeenCalledWith('refresh-token');
    expect(response.body).toEqual({
      user: {
        sub: 'user-id',
        email: 'user@example.com',
      },
    });
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          `${ACCESS_TOKEN_COOKIE_NAME}=next-access-token`,
        ),
        expect.stringContaining(
          `${REFRESH_TOKEN_COOKIE_NAME}=next-refresh-token`,
        ),
        expect.stringContaining(`${CSRF_TOKEN_COOKIE_NAME}=next-csrf-token`),
      ]),
    );
  });

  it('/auth/logout (POST) clears auth cookies', async () => {
    const httpServer = app.getHttpServer() as Parameters<typeof request>[0];

    const response = await request(httpServer).post('/auth/logout').expect(200);

    expect(response.body).toEqual({ success: true });
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`${ACCESS_TOKEN_COOKIE_NAME}=;`),
        expect.stringContaining(`${REFRESH_TOKEN_COOKIE_NAME}=;`),
        expect.stringContaining(`${CSRF_TOKEN_COOKIE_NAME}=;`),
      ]),
    );
  });
});
