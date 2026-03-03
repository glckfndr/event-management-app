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

  @Column({ type: 'int', default: 1 })
  capacity!: number;

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
