import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { AssistantPanel } from "./AssistantPanel";

const meta = {
  title: "Assistant/AssistantPanel",
  component: AssistantPanel,
  tags: ["autodocs"],
  render: (args) => {
    const [assistantQuestion, setAssistantQuestion] = useState(
      args.assistantQuestion,
    );

    return (
      <AssistantPanel
        {...args}
        assistantQuestion={assistantQuestion}
        setAssistantQuestion={setAssistantQuestion}
      />
    );
  },
  args: {
    assistantQuestion: "",
    assistantStatus: "idle",
    assistantError: null,
    assistantAnswer: null,
    suggestedQuestions: [
      "When is my next event?",
      "How many events do I have this month?",
    ],
    recentQuestions: ["Show my tech events", "What is this weekend schedule?"],
    onSelectRecentQuestion: () => undefined,
    onSubmit: (event) => {
      event.preventDefault();
    },
  },
} satisfies Meta<typeof AssistantPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Idle: Story = {};

export const Loading: Story = {
  args: {
    assistantStatus: "loading",
    assistantQuestion: "How many events do I have?",
  },
};

export const WithAnswer: Story = {
  args: {
    assistantAnswer:
      "You have 3 events this week. The next one starts tomorrow at 18:00.",
  },
};

export const Failed: Story = {
  args: {
    assistantStatus: "failed",
    assistantError: "Failed to get assistant answer",
    assistantQuestion: "How many events do I have?",
  },
};
