import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Event } from '../events/entities/event.entity';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me/events')
  @ApiOperation({ summary: "Fetch current user's events (calendar)" })
  @ApiResponse({ status: 200, description: 'List of user events' })
  getMyEvents(
    @CurrentUser() user: { sub: string; email: string },
  ): Promise<Event[]> {
    return this.usersService.getMyEvents(user.sub);
  }
}
