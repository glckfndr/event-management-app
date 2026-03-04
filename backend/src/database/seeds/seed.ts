import 'dotenv/config';
import { hash } from 'bcrypt';
import AppDataSource from '../../data-source';
import { User } from '../../users/entities/user.entity';
import { Event, EventVisibility } from '../../events/entities/event.entity';

type SeedUser = {
  email: string;
  name: string;
  password: string;
};

type SeedEvent = {
  title: string;
  description: string;
  location: string;
  capacity: number | null;
  visibility: EventVisibility;
  startsInDays: number;
  organizerEmail: string;
};

const usersToSeed: SeedUser[] = [
  {
    email: 'alice@example.com',
    name: 'Alice Organizer',
    password: 'Password123!',
  },
  {
    email: 'bob@example.com',
    name: 'Bob Attendee',
    password: 'Password123!',
  },
];

const eventsToSeed: SeedEvent[] = [
  {
    title: 'Public Tech Meetup',
    description: 'A public meetup for backend and frontend developers.',
    location: 'Kyiv',
    capacity: 80,
    visibility: EventVisibility.PUBLIC,
    startsInDays: 7,
    organizerEmail: 'alice@example.com',
  },
  {
    title: 'Open API Workshop',
    description: 'Hands-on workshop focused on REST and API design.',
    location: 'Lviv',
    capacity: 30,
    visibility: EventVisibility.PUBLIC,
    startsInDays: 14,
    organizerEmail: 'alice@example.com',
  },
  {
    title: 'Community Networking Night',
    description: 'Open networking event for product and engineering teams.',
    location: 'Online',
    capacity: null,
    visibility: EventVisibility.PUBLIC,
    startsInDays: 21,
    organizerEmail: 'bob@example.com',
  },
];

const toFutureDate = (startsInDays: number): Date => {
  const now = new Date();
  now.setDate(now.getDate() + startsInDays);
  return now;
};

const seed = async (): Promise<void> => {
  await AppDataSource.initialize();

  const usersRepository = AppDataSource.getRepository(User);
  const eventsRepository = AppDataSource.getRepository(Event);

  const usersByEmail = new Map<string, User>();

  for (const userData of usersToSeed) {
    let user = await usersRepository.findOne({
      where: { email: userData.email },
    });

    if (!user) {
      const hashedPassword = await hash(userData.password, 10);
      user = usersRepository.create({
        email: userData.email,
        name: userData.name,
        password: hashedPassword,
      });
      user = await usersRepository.save(user);
      console.log(`Seeded user: ${user.email}`);
    } else {
      console.log(`User already exists, skipped: ${user.email}`);
    }

    usersByEmail.set(userData.email, user);
  }

  for (const eventData of eventsToSeed) {
    const organizer = usersByEmail.get(eventData.organizerEmail);

    if (!organizer) {
      throw new Error(
        `Organizer ${eventData.organizerEmail} was not found during event seeding.`,
      );
    }

    const existingEvent = await eventsRepository.findOne({
      where: {
        title: eventData.title,
        organizerId: organizer.id,
      },
    });

    if (existingEvent) {
      console.log(`Event already exists, skipped: ${eventData.title}`);
      continue;
    }

    const event = eventsRepository.create({
      title: eventData.title,
      description: eventData.description,
      location: eventData.location,
      eventDate: toFutureDate(eventData.startsInDays),
      capacity: eventData.capacity,
      visibility: eventData.visibility,
      organizerId: organizer.id,
    });

    await eventsRepository.save(event);
    console.log(`Seeded event: ${event.title}`);
  }
};

seed()
  .then(async () => {
    console.log('Seeding completed successfully.');
    await AppDataSource.destroy();
  })
  .catch(async (error: unknown) => {
    console.error('Seeding failed:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  });
