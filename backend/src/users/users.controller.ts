import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Event } from '../events/entities/event.entity';
import { UsersService } from './users.service';

type AuthenticatedRequest = Request & {
  user: {
    sub: string;
    email: string;
  };
};

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me/events')
  @ApiOperation({ summary: "Fetch current user's events (calendar)" })
  @ApiResponse({ status: 200, description: 'List of user events' })
  getMyEvents(@Req() req: AuthenticatedRequest): Promise<Event[]> {
    return this.usersService.getMyEvents(req.user.sub);
  }
}
