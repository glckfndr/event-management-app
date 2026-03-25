import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentProps } from "react";
import { AssistantPanel } from "./AssistantPanel";

type AssistantPanelStoryArgs = ComponentProps<typeof AssistantPanel>;

const meta = {
  title: "Assistant/AssistantPanel",
  component: AssistantPanel,
  tags: ["autodocs"],
  args: {
    suggestedQuestions: [
      "When is my next event?",
      "How many events do I have this month?",
    ],
    onSubmit: () => undefined,
  },
} satisfies Meta<AssistantPanelStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Idle: Story = {};

export const Loading: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Loading state depends on the Redux store in Storybook decorators.",
      },
    },
  },
};

export const WithAnswer: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Answer rendering depends on the Redux store in Storybook decorators.",
      },
    },
  },
};

export const Failed: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Error rendering depends on the Redux store in Storybook decorators.",
      },
    },
  },
};
