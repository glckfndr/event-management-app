import type { Meta, StoryObj } from "@storybook/react-vite";
import { FormField } from "./FormField";

const meta = {
  title: "UI/FormField",
  component: FormField,
  tags: ["autodocs"],
  render: (args) => (
    <div className="max-w-md rounded-xl border border-slate-200 bg-white p-4">
      <FormField {...args}>
        <input
          id="event-title"
          defaultValue="Product Meetup"
          className="w-full rounded-xl border border-slate-300 px-4 py-2 text-slate-700"
        />
      </FormField>
    </div>
  ),
} satisfies Meta<typeof FormField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: "Event title",
    htmlFor: "event-title",
    required: true,
    hint: <p className="text-sm text-slate-500">Keep it short and clear.</p>,
  },
};

export const WithError: Story = {
  args: {
    label: "Event title",
    htmlFor: "event-title",
    required: true,
    errorMessage: "Title is required",
  },
};
