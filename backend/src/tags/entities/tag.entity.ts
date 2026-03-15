import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Event } from '../../events/entities/event.entity';

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  name!: string;

  @ManyToMany(() => Event, (event: Event): Tag[] => event.tags)
  events!: Event[];

  @BeforeInsert()
  @BeforeUpdate()
  normalizeName(): void {
    if (typeof this.name !== 'string') {
      throw new Error('Tag name must be a non-empty string');
    }

    const normalized = this.name.trim().toLowerCase();

    if (!normalized) {
      throw new Error('Tag name must be a non-empty string');
    }

    this.name = normalized;
  }
}
