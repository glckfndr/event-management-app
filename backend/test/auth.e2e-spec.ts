import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { JwtStrategy } from '../src/auth/jwt.strategy';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let authService: { register: jest.Mock; login: jest.Mock };

  beforeAll(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({
          secret: process.env.JWT_SECRET ?? 'dev-jwt-secret',
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
      accessToken: token,
      tokenType: 'Bearer',
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
      .expect(201);

    const meResponse = await request(httpServer)
      .get('/auth/me')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
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
});
