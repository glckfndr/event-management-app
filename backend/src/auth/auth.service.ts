import { ConflictException, Injectable } from '@nestjs/common';
import { hash } from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

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
}
