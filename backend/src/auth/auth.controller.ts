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
import { AuthService } from './auth.service';
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

type AuthSessionResponse = {
  user: { sub: string; email: string };
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
};

type AuthControllerServiceContract = {
  register: AuthService['register'];
  login: (loginDto: LoginDto) => Promise<AuthSessionResponse>;
  refreshSession: (refreshToken: string) => Promise<AuthSessionResponse>;
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private getAuthService(): AuthControllerServiceContract {
    return this.authService as unknown as AuthControllerServiceContract;
  }

  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.getAuthService().register(registerDto);
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.getAuthService().login(loginDto);
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
  ) {
    const refreshToken = extractRefreshTokenFromRequest(request);

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is missing.');
    }

    const session = await this.getAuthService().refreshSession(refreshToken);
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
