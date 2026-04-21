import { DataSource, Repository } from 'typeorm';
import { DataType, newDb } from 'pg-mem';
import { randomUUID } from 'crypto';
import { User } from '../users/entities/user.entity';
import { Event } from '../events/entities/event.entity';
import { Participant } from '../participants/entities/participant.entity';
import { Tag } from '../tags/entities/tag.entity';
import { EventInvitation } from '../invitations/entities/event-invitation.entity';

describe('Database tables relations', () => {
  let dataSource: DataSource;
  let usersRepository: Repository<User>;
  let eventsRepository: Repository<Event>;
  let participantsRepository: Repository<Participant>;
  let tagsRepository: Repository<Tag>;
  let invitationsRepository: Repository<EventInvitation>;

  beforeAll(async () => {
    const db = newDb({ autoCreateForeignKeyIndices: true });

    db.public.registerFunction({
      name: 'uuid_generate_v4',
      returns: DataType.uuid,
      implementation: () => randomUUID(),
      impure: true,
    });

    db.public.registerFunction({
      name: 'version',
      returns: DataType.text,
      implementation: () => 'PostgreSQL 16.0',
    });

    db.public.registerFunction({
      name: 'current_database',
      returns: DataType.text,
      implementation: () => 'test',
    });

    dataSource = await db.adapters.createTypeormDataSource({
      type: 'postgres',
      entities: [User, Event, Participant, Tag, EventInvitation],
      synchronize: true,
    });

    await dataSource.initialize();

    await dataSource.query(
      // Match production behavior for case-insensitive tag uniqueness.
      'CREATE UNIQUE INDEX "IDX_tags_name_ci_unique" ON "tags" (LOWER("name"))',
    );

    usersRepository = dataSource.getRepository(User);
    eventsRepository = dataSource.getRepository(Event);
    participantsRepository = dataSource.getRepository(Participant);
    tagsRepository = dataSource.getRepository(Tag);
    invitationsRepository = dataSource.getRepository(EventInvitation);
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  beforeEach(async () => {
    // Clear join table first to satisfy FK constraints.
    await dataSource.createQueryBuilder().delete().from('event_tags').execute();
    await invitationsRepository.createQueryBuilder().delete().execute();
    await participantsRepository.createQueryBuilder().delete().execute();
    await tagsRepository.createQueryBuilder().delete().execute();
    await eventsRepository.createQueryBuilder().delete().execute();
    await usersRepository.createQueryBuilder().delete().execute();
  });

  it('enforces case-insensitive unique tag names', async () => {
    await dataSource.query('INSERT INTO "tags" ("name") VALUES ($1)', ['Tech']);

    await expect(
      dataSource.query('INSERT INTO "tags" ("name") VALUES ($1)', ['tech']),
    ).rejects.toThrow();
  });

  it('supports event to tag many-to-many relation', async () => {
    const organizer = await usersRepository.save(
      usersRepository.create({
        email: 'tags-organizer@example.com',
        password: 'hashed-password',
        name: 'Tags Organizer',
      }),
    );

    const [techTag, artTag] = await tagsRepository.save([
      tagsRepository.create({ name: 'Tech' }),
      tagsRepository.create({ name: 'Art' }),
    ]);

    const event = eventsRepository.create({
      title: 'Tagged event',
      eventDate: new Date('2026-10-01T12:00:00.000Z'),
      organizerId: organizer.id,
      tags: [techTag, artTag],
    });

    await eventsRepository.save(event);

    const savedEvent = await eventsRepository.findOne({
      where: { id: event.id },
      relations: { tags: true },
    });

    expect(savedEvent?.tags.map((tag) => tag.name).sort()).toEqual([
      'art',
      'tech',
    ]);
  });

  it('enforces unique users email', async () => {
    await usersRepository.save(
      usersRepository.create({
        email: 'duplicate@example.com',
        password: 'hashed-password',
        name: 'First User',
      }),
    );

    await expect(
      usersRepository.save(
        usersRepository.create({
          email: 'duplicate@example.com',
          password: 'hashed-password-2',
          name: 'Second User',
        }),
      ),
    ).rejects.toThrow();
  });

  it('rejects event with missing organizer', async () => {
    await expect(
      eventsRepository.save(
        eventsRepository.create({
          title: 'Event without organizer',
          eventDate: new Date('2026-04-01T10:00:00.000Z'),
          capacity: 10,
          organizerId: randomUUID(),
        }),
      ),
    ).rejects.toThrow();
  });

  it('enforces unique participant pair userId+eventId', async () => {
    const organizer = await usersRepository.save(
      usersRepository.create({
        email: 'organizer@example.com',
        password: 'hashed-password',
        name: 'Organizer',
      }),
    );

    const attendee = await usersRepository.save(
      usersRepository.create({
        email: 'attendee@example.com',
        password: 'hashed-password',
        name: 'Attendee',
      }),
    );

    const event = await eventsRepository.save(
      eventsRepository.create({
        title: 'Unique participant test event',
        eventDate: new Date('2026-05-01T12:00:00.000Z'),
        capacity: 50,
        organizerId: organizer.id,
      }),
    );

    await participantsRepository.save(
      participantsRepository.create({
        userId: attendee.id,
        eventId: event.id,
      }),
    );

    await expect(
      participantsRepository.save(
        participantsRepository.create({
          userId: attendee.id,
          eventId: event.id,
        }),
      ),
    ).rejects.toThrow();
  });

  it('cascades participants delete when event is removed', async () => {
    const organizer = await usersRepository.save(
      usersRepository.create({
        email: 'cascade-organizer@example.com',
        password: 'hashed-password',
        name: 'Cascade Organizer',
      }),
    );

    const attendee = await usersRepository.save(
      usersRepository.create({
        email: 'cascade-attendee@example.com',
        password: 'hashed-password',
        name: 'Cascade Attendee',
      }),
    );

    const event = await eventsRepository.save(
      eventsRepository.create({
        title: 'Cascade test event',
        eventDate: new Date('2026-06-01T12:00:00.000Z'),
        capacity: 15,
        organizerId: organizer.id,
      }),
    );

    await participantsRepository.save(
      participantsRepository.create({
        userId: attendee.id,
        eventId: event.id,
      }),
    );

    await eventsRepository.delete({ id: event.id });

    const participantsCount = await participantsRepository.count();
    expect(participantsCount).toBe(0);
  });

  it('cascades organizer deletion to events and participants', async () => {
    const organizer = await usersRepository.save(
      usersRepository.create({
        email: 'delete-organizer@example.com',
        password: 'hashed-password',
        name: 'Delete Organizer',
      }),
    );

    const attendee = await usersRepository.save(
      usersRepository.create({
        email: 'delete-organizer-attendee@example.com',
        password: 'hashed-password',
        name: 'Delete Organizer Attendee',
      }),
    );

    const event = await eventsRepository.save(
      eventsRepository.create({
        title: 'Organizer cascade event',
        eventDate: new Date('2026-07-01T12:00:00.000Z'),
        capacity: 20,
        organizerId: organizer.id,
      }),
    );

    await participantsRepository.save(
      participantsRepository.create({
        userId: attendee.id,
        eventId: event.id,
      }),
    );

    await usersRepository.delete({ id: organizer.id });

    const eventsCount = await eventsRepository.count();
    const participantsCount = await participantsRepository.count();

    expect(eventsCount).toBe(0);
    expect(participantsCount).toBe(0);
  });

  it('cascades attendee deletion to participants only', async () => {
    const organizer = await usersRepository.save(
      usersRepository.create({
        email: 'attendee-cascade-organizer@example.com',
        password: 'hashed-password',
        name: 'Attendee Cascade Organizer',
      }),
    );

    const attendee = await usersRepository.save(
      usersRepository.create({
        email: 'attendee-cascade-user@example.com',
        password: 'hashed-password',
        name: 'Attendee Cascade User',
      }),
    );

    const event = await eventsRepository.save(
      eventsRepository.create({
        title: 'Attendee cascade event',
        eventDate: new Date('2026-08-01T12:00:00.000Z'),
        capacity: 20,
        organizerId: organizer.id,
      }),
    );

    await participantsRepository.save(
      participantsRepository.create({
        userId: attendee.id,
        eventId: event.id,
      }),
    );

    await usersRepository.delete({ id: attendee.id });

    const eventsCount = await eventsRepository.count();
    const participantsCount = await participantsRepository.count();

    expect(eventsCount).toBe(1);
    expect(participantsCount).toBe(0);
  });

  it('enforces unique invitation pair eventId+invitedUserId', async () => {
    const organizer = await usersRepository.save(
      usersRepository.create({
        email: 'invite-organizer@example.com',
        password: 'hashed-password',
        name: 'Invite Organizer',
      }),
    );

    const invitedUser = await usersRepository.save(
      usersRepository.create({
        email: 'invite-user@example.com',
        password: 'hashed-password',
        name: 'Invite User',
      }),
    );

    const event = await eventsRepository.save(
      eventsRepository.create({
        title: 'Invitation uniqueness event',
        eventDate: new Date('2026-08-12T12:00:00.000Z'),
        organizerId: organizer.id,
      }),
    );

    await invitationsRepository.save(
      invitationsRepository.create({
        eventId: event.id,
        invitedByUserId: organizer.id,
        invitedUserId: invitedUser.id,
      }),
    );

    await expect(
      invitationsRepository.save(
        invitationsRepository.create({
          eventId: event.id,
          invitedByUserId: organizer.id,
          invitedUserId: invitedUser.id,
        }),
      ),
    ).rejects.toThrow();
  });

  it('cascades event deletion to invitations', async () => {
    const organizer = await usersRepository.save(
      usersRepository.create({
        email: 'event-delete-organizer@example.com',
        password: 'hashed-password',
        name: 'Event Delete Organizer',
      }),
    );

    const invitedUser = await usersRepository.save(
      usersRepository.create({
        email: 'event-delete-invitee@example.com',
        password: 'hashed-password',
        name: 'Event Delete Invitee',
      }),
    );

    const event = await eventsRepository.save(
      eventsRepository.create({
        title: 'Event invitation cascade test',
        eventDate: new Date('2026-09-01T12:00:00.000Z'),
        organizerId: organizer.id,
      }),
    );

    await invitationsRepository.save(
      invitationsRepository.create({
        eventId: event.id,
        invitedByUserId: organizer.id,
        invitedUserId: invitedUser.id,
      }),
    );

    await eventsRepository.delete({ id: event.id });

    const invitationsCount = await invitationsRepository.count();
    expect(invitationsCount).toBe(0);
  });
});
