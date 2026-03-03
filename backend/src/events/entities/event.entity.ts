import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

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

  @ManyToOne(() => User, (user) => user.organizedEvents, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organizerId' })
  organizer!: User;

  @Column({ type: 'uuid' })
  organizerId!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
