import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentProps, useState } from "react";
import { EventTagsField } from "./EventTagsField";

type EventTagsFieldStoryProps = ComponentProps<typeof EventTagsField>;

function EventTagsFieldStoryRenderer(args: EventTagsFieldStoryProps) {
  const [tags, setTags] = useState(args.value);

  return (
    <div className="max-w-xl rounded-xl border border-slate-200 bg-white p-4">
      <EventTagsField {...args} value={tags} onChange={setTags} />
    </div>
  );
}

const meta = {
  title: "Event Form/EventTagsField",
  component: EventTagsField,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  render: (args) => <EventTagsFieldStoryRenderer {...args} />,
  args: {
    id: "event-tags-story",
    value: ["Tech", "Marketing"],
    onChange: () => undefined,
  },
} satisfies Meta<typeof EventTagsField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    value: [],
  },
};

export const WithValidationError: Story = {
  args: {
    errorMessage: "Please add at least one tag",
  },
};
