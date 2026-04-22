import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateInvitationDto {
  @ApiProperty({
    example: '4f3f8c2f-22d5-4f9f-a5ec-9f47d8f83514',
    description: 'User ID that should receive invitation to the private event',
  })
  @IsUUID()
  invitedUserId!: string;
}
