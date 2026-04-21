import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService, type AuthSessionPayload } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import {
  clearAuthCookies,
  extractRefreshTokenFromRequest,
  setAuthCookies,
} from './auth-cookie.helpers';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: { sub: string; email: string } }> {
    const session: AuthSessionPayload = await this.authService.login(loginDto);
    setAuthCookies(response, session);

    return {
      user: session.user,
    };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: { sub: string; email: string } }> {
    const refreshToken = extractRefreshTokenFromRequest(request);

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is missing.');
    }

    const session: AuthSessionPayload =
      await this.authService.refreshSession(refreshToken);
    setAuthCookies(response, session);

    return {
      user: session.user,
    };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) response: Response) {
    clearAuthCookies(response);

    return {
      success: true,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  me(@Req() request: { user: { sub: string; email: string } }) {
    const { sub, email } = request.user;

    return { sub, email };
  }
}
