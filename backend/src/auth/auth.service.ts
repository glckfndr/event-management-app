import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { compare, hash } from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { createCsrfToken } from './auth-cookie.helpers';
import {
  resolveRefreshJwtExpiresIn,
  resolveRefreshJwtSecret,
} from './jwt.config';

export type SessionUser = {
  sub: string;
  email: string;
};

export type AuthSessionPayload = {
  user: SessionUser;
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
};

type RefreshTokenPayload = {
  sub: string;
  email: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{
    id: string;
    email: string;
    name: string | null;
    createdAt: Date;
  }> {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists.');
    }

    // Persist only hashed passwords.
    const hashedPassword = await hash(registerDto.password, 10);

    const createdUser = await this.usersService.createUser({
      email: registerDto.email,
      password: hashedPassword,
      name: registerDto.name,
    });

    return {
      id: createdUser.id,
      email: createdUser.email,
      name: createdUser.name ?? null,
      createdAt: createdUser.createdAt,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthSessionPayload> {
    const user = await this.usersService.findByEmailWithPassword(
      loginDto.email,
    );

    // Use the same error message to avoid leaking which field is invalid.
    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const isPasswordValid = await compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    return this.createSessionPayload({
      sub: user.id,
      email: user.email,
    });
  }

  async refreshSession(refreshToken: string): Promise<AuthSessionPayload> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const existingUser = await this.usersService.findByEmail(payload.email);

    if (!existingUser || existingUser.id !== payload.sub) {
      throw new UnauthorizedException('Invalid session.');
    }

    return this.createSessionPayload({
      sub: existingUser.id,
      email: existingUser.email,
    });
  }

  private async createSessionPayload(
    user: SessionUser,
  ): Promise<AuthSessionPayload> {
    const accessToken = await this.jwtService.signAsync(user);
    const refreshToken = await this.jwtService.signAsync(user, {
      secret: resolveRefreshJwtSecret(),
      expiresIn: resolveRefreshJwtExpiresIn(),
    });

    return {
      user,
      accessToken,
      refreshToken,
      csrfToken: createCsrfToken(),
    };
  }

  private async verifyRefreshToken(
    refreshToken: string,
  ): Promise<RefreshTokenPayload> {
    try {
      return await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        {
          secret: resolveRefreshJwtSecret(),
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid session.');
    }
  }
}
