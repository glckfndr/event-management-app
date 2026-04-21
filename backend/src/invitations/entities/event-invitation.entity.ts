import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Event } from '../../events/entities/event.entity';
import { User } from '../../users/entities/user.entity';

export enum EventInvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  REVOKED = 'revoked',
}

@Entity('event_invitations')
@Unique(['eventId', 'invitedUserId'])
export class EventInvitation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Event, (event) => event.invitations, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'eventId' })
  event!: Event;

  @Column({ type: 'uuid' })
  eventId!: string;

  @ManyToOne(() => User, (user) => user.sentInvitations, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'invitedByUserId' })
  invitedByUser!: User;

  @Column({ type: 'uuid' })
  invitedByUserId!: string;

  @ManyToOne(() => User, (user) => user.receivedInvitations, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'invitedUserId' })
  invitedUser!: User;

  @Column({ type: 'uuid' })
  invitedUserId!: string;

  @Column({
    type: 'enum',
    enum: EventInvitationStatus,
    default: EventInvitationStatus.PENDING,
  })
  status!: EventInvitationStatus;

  @CreateDateColumn()
  createdAt!: Date;
}
