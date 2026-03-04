import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { StringValue } from 'ms';
import { JwtStrategy } from './jwt.strategy';
import { resolveJwtSecret } from './jwt.config';

const jwtExpiresIn = (process.env.JWT_EXPIRES_IN ?? '1h') as StringValue;
const jwtSecret = resolveJwtSecret();

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: jwtSecret,
      signOptions: { expiresIn: jwtExpiresIn },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [JwtModule],
})
export class AuthModule {}
