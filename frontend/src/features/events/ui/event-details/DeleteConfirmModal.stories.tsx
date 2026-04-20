import type { Meta, StoryObj } from "@storybook/react-vite";
import { DeleteConfirmModal } from "./DeleteConfirmModal";

const meta = {
  title: "Event Details/DeleteConfirmModal",
  component: DeleteConfirmModal,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  args: {
    isBusy: false,
    onCancel: () => undefined,
    onConfirm: () => undefined,
  },
} satisfies Meta<typeof DeleteConfirmModal>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Idle: Story = {};

export const Busy: Story = {
  args: {
    isBusy: true,
  },
};
