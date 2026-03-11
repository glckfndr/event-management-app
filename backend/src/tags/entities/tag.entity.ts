import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  Index,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Event } from '../../events/entities/event.entity';

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('IDX_tags_name_unique', { unique: true })
  @Column({ type: 'varchar', length: 50 })
  name!: string;

  @ManyToMany(() => Event, (event: Event): Tag[] => event.tags)
  events!: Event[];

  @BeforeInsert()
  @BeforeUpdate()
  normalizeName(): void {
    this.name = this.name.trim().toLowerCase();
  }
}
