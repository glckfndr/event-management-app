import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Event } from '../../events/entities/event.entity';
import { Participant } from '../../participants/entities/participant.entity';
import { EventInvitation } from '../../invitations/entities/event-invitation.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ select: false })
  password!: string;

  @Column({ nullable: true })
  name?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @OneToMany(() => Event, (event) => event.organizer)
  organizedEvents!: Event[];

  @OneToMany(() => Participant, (participant) => participant.user)
  participations!: Participant[];

  @OneToMany(() => EventInvitation, (invitation) => invitation.invitedByUser)
  sentInvitations!: EventInvitation[];

  @OneToMany(() => EventInvitation, (invitation) => invitation.invitedUser)
  receivedInvitations!: EventInvitation[];
}
