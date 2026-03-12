import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import ormconfig from './ormconfig';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EventsModule } from './events/events.module';
import { AuthMiddleware } from './auth/auth.middleware';
import { AssistantModule } from './assistant/assistant.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(ormconfig),
    AuthModule,
    UsersModule,
    EventsModule,
    AssistantModule,
  ],
  controllers: [AppController],
  providers: [AppService, AuthMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AuthMiddleware).forRoutes({
      path: 'events/:id',
      method: RequestMethod.GET,
    });
  }
}
