import { EventDateTimePickerField } from "./EventFormFields";

type RenderDateTimeFieldOptions = {
  label: string;
  mode: "date" | "time";
  value: string;
  onChange: (nextValue: string) => void;
  id?: string;
  required?: boolean;
  dense?: boolean;
  errorMessage?: string;
  onBlur?: () => void;
};

export function renderDateTimeField(options: RenderDateTimeFieldOptions) {
  return (
    <EventDateTimePickerField
      label={options.label}
      required={options.required ?? true}
      id={options.id}
      mode={options.mode}
      value={options.value}
      onChange={options.onChange}
      onBlur={options.onBlur}
      dense={options.dense}
      errorMessage={options.errorMessage}
    />
  );
}
