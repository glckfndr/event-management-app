import type { Meta, StoryObj } from "@storybook/react-vite";
import { CalendarIcon } from "./icons/CalendarIcon";
import { DatePickerInput } from "./DatePickerInput";

const baseInputClassName =
  "w-full rounded-xl border border-slate-300 px-4 py-2 pr-11 text-[1.05rem] text-slate-700 placeholder:text-slate-400";

const meta = {
  title: "UI/DatePickerInput",
  component: DatePickerInput,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
  args: {
    icon: <CalendarIcon />,
    className: baseInputClassName,
    placeholder: "Select date and time",
    value: "2099-11-12 18:30",
    readOnly: true,
    "aria-label": "Event date and time",
  },
} satisfies Meta<typeof DatePickerInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    value: "",
    placeholder: "Choose date",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    className: `${baseInputClassName} bg-slate-100 text-slate-500`,
  },
};
