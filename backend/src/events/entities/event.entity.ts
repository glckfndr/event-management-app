import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Participant } from '../../participants/entities/participant.entity';
import { Tag } from '../../tags/entities/tag.entity';
import { EventInvitation } from '../../invitations/entities/event-invitation.entity';

export enum EventVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}
@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'timestamp' })
  eventDate!: Date;

  @Column({ nullable: true })
  location?: string;

  @Column({ type: 'int', nullable: true })
  capacity?: number | null;

  @Column({
    type: 'enum',
    enum: EventVisibility,
    default: EventVisibility.PUBLIC,
  })
  visibility!: EventVisibility;

  @ManyToOne(() => User, (user: User): Event[] => user.organizedEvents, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organizerId' })
  organizer!: User;

  @Column({ type: 'uuid' })
  organizerId!: string;

  @OneToMany(
    () => Participant,
    (participant: Participant): Event => participant.event,
  )
  participants!: Participant[];

  @OneToMany(
    () => EventInvitation,
    (invitation: EventInvitation): Event => invitation.event,
  )
  invitations!: EventInvitation[];

  @ManyToMany(() => Tag, (tag: Tag): Event[] => tag.events)
  @JoinTable({
    name: 'event_tags',
    joinColumn: { name: 'eventId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' },
  })
  tags!: Tag[];

  @CreateDateColumn()
  createdAt!: Date;
}
