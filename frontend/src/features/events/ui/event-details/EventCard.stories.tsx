import type { Meta, StoryObj } from "@storybook/react-vite";
import { EventCard } from "./EventCard";
import type { EventItem } from "../../../../types/event";

const baseEvent: EventItem = {
  id: "event-1",
  title: "Frontend Architecture Meetup",
  description:
    "Hands-on session on scalable React architecture, state boundaries, and performance profiling.",
  eventDate: "2099-11-12T18:30:00.000Z",
  location: "Kyiv, Unit City",
  capacity: 50,
  visibility: "public",
  organizerId: "organizer-1",
  organizer: {
    id: "organizer-1",
    email: "organizer@example.com",
    name: "Event Host",
  },
  participants: [
    {
      id: "participant-1",
      userId: "user-1",
      eventId: "event-1",
      joinedAt: "2099-11-01T10:00:00.000Z",
    },
    {
      id: "participant-2",
      userId: "user-2",
      eventId: "event-1",
      joinedAt: "2099-11-02T10:00:00.000Z",
    },
  ],
  tags: [
    { id: "tag-1", name: "Tech" },
    { id: "tag-2", name: "Business" },
    { id: "tag-3", name: "Design" },
    { id: "tag-4", name: "Community" },
  ],
};

const meta = {
  title: "Event Details/EventCard",
  component: EventCard,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  args: {
    event: baseEvent,
    state: {
      token: "token",
      isOrganizer: false,
      isJoined: false,
      isBusy: false,
    },
    handlers: {
      onOpen: () => undefined,
      onJoin: () => undefined,
      onLeave: () => undefined,
      onRequireLogin: () => undefined,
    },
  },
} satisfies Meta<typeof EventCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Joined: Story = {
  args: {
    state: {
      token: "token",
      isOrganizer: false,
      isJoined: true,
      isBusy: false,
    },
  },
};

export const OrganizerView: Story = {
  args: {
    state: {
      token: "token",
      isOrganizer: true,
      isJoined: false,
      isBusy: false,
    },
  },
};

export const FullEvent: Story = {
  args: {
    event: {
      ...baseEvent,
      capacity: 2,
      participants: [
        {
          id: "participant-1",
          userId: "user-1",
          eventId: "event-1",
          joinedAt: "2099-11-01T10:00:00.000Z",
        },
        {
          id: "participant-2",
          userId: "user-2",
          eventId: "event-1",
          joinedAt: "2099-11-02T10:00:00.000Z",
        },
      ],
    },
    state: {
      token: "token",
      isOrganizer: false,
      isJoined: false,
      isBusy: false,
    },
  },
};
