import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Event } from './entities/event.entity';
import { EventsService } from './events.service';

type AuthenticatedRequest = Request & {
  user: {
    sub: string;
    email: string;
  };
};

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'Fetch list of public events' })
  @ApiResponse({ status: 200, description: 'List of events' })
  findAll(): Promise<Event[]> {
    return this.eventsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch event by id' })
  @ApiResponse({ status: 200, description: 'Event details' })
  findOne(@Param('id') id: string): Promise<Event> {
    return this.eventsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Create a new event' })
  @ApiResponse({ status: 201, description: 'Event created successfully' })
  create(
    @Body() createEventDto: CreateEventDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<Event> {
    return this.eventsService.create(createEventDto, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: 'Update event (organizer only)' })
  @ApiResponse({ status: 200, description: 'Event updated successfully' })
  update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<Event> {
    return this.eventsService.update(id, updateEventDto, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete event (organizer only)' })
  @ApiResponse({ status: 204, description: 'Event deleted successfully' })
  async remove(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    await this.eventsService.remove(id, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(':id/join')
  @HttpCode(200)
  @ApiOperation({ summary: 'Join event' })
  @ApiResponse({ status: 200, description: 'Joined event successfully' })
  async joinEvent(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    await this.eventsService.joinEvent(id, req.user);
    return { message: 'Joined event successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(':id/leave')
  @HttpCode(200)
  @ApiOperation({ summary: 'Leave event' })
  @ApiResponse({ status: 200, description: 'Left event successfully' })
  async leaveEvent(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    await this.eventsService.leaveEvent(id, req.user);
    return { message: 'Left event successfully' };
  }
}
