import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentProps, useState } from "react";
import { VisibilityFieldset } from "./VisibilityFieldset";

type VisibilityFieldsetStoryArgs = Omit<
  ComponentProps<typeof VisibilityFieldset>,
  "publicControl" | "privateControl"
>;

function VisibilityFieldsetStoryRenderer(args: VisibilityFieldsetStoryArgs) {
  const [value, setValue] = useState<"public" | "private">("public");

  return (
    <div className="max-w-xl rounded-xl border border-slate-200 bg-white p-4">
      <VisibilityFieldset
        {...args}
        publicControl={
          <input
            type="radio"
            name="visibility"
            checked={value === "public"}
            onChange={() => setValue("public")}
          />
        }
        privateControl={
          <input
            type="radio"
            name="visibility"
            checked={value === "private"}
            onChange={() => setValue("private")}
          />
        }
      />
    </div>
  );
}

const meta = {
  title: "UI/VisibilityFieldset",
  component: VisibilityFieldsetStoryRenderer,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
} satisfies Meta<VisibilityFieldsetStoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithError: Story = {
  args: {
    errorMessage: "Select event visibility",
  },
};
