import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateEventDto } from './dto/create-event.dto';
import { FindEventsQueryDto } from './dto/find-events-query.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Event } from './entities/event.entity';
import { EventsService } from './events.service';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'Fetch list of public events' })
  @ApiResponse({ status: 200, description: 'List of events' })
  findAll(@Query() query: FindEventsQueryDto): Promise<Event[]> {
    return this.eventsService.findAll(query.tags);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch event by id' })
  @ApiResponse({ status: 200, description: 'Event details' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user?: { sub: string; email: string },
  ): Promise<Event> {
    return this.eventsService.findOne(id, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Create a new event' })
  @ApiResponse({ status: 201, description: 'Event created successfully' })
  create(
    @Body() createEventDto: CreateEventDto,
    @CurrentUser() user: { sub: string; email: string },
  ): Promise<Event> {
    return this.eventsService.create(createEventDto, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({ summary: 'Update event (organizer only)' })
  @ApiResponse({ status: 200, description: 'Event updated successfully' })
  update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
    @CurrentUser() user: { sub: string; email: string },
  ): Promise<Event> {
    return this.eventsService.update(id, updateEventDto, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete event (organizer only)' })
  @ApiResponse({ status: 204, description: 'Event deleted successfully' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string; email: string },
  ): Promise<void> {
    await this.eventsService.remove(id, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(':id/join')
  @HttpCode(200)
  @ApiOperation({ summary: 'Join event' })
  @ApiResponse({ status: 200, description: 'Joined event successfully' })
  async joinEvent(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string; email: string },
  ): Promise<{ message: string }> {
    await this.eventsService.joinEvent(id, user);
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
    @CurrentUser() user: { sub: string; email: string },
  ): Promise<{ message: string }> {
    await this.eventsService.leaveEvent(id, user);
    return { message: 'Left event successfully' };
  }
}
