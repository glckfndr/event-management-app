import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Participant } from '../../participants/entities/participant.entity';

<<<<<<< HEAD
export enum EventVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

=======
>>>>>>> origin/main
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

<<<<<<< HEAD
  @Column({ type: 'int', nullable: true })
  capacity?: number | null;

  @Column({
    type: 'enum',
    enum: EventVisibility,
    default: EventVisibility.PUBLIC,
  })
  visibility!: EventVisibility;
=======
  @Column({ type: 'int', default: 1 })
  capacity!: number;
>>>>>>> origin/main

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

  @CreateDateColumn()
  createdAt!: Date;
}
