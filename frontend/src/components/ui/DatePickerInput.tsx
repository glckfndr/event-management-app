import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type DatePickerInputProps = ComponentPropsWithoutRef<"input"> & {
  icon: ReactNode;
};

export const DatePickerInput = forwardRef<
  HTMLInputElement,
  DatePickerInputProps
>(({ icon, className, ...inputProps }, ref) => (
  <div className="relative w-full">
    <input ref={ref} className={className} {...inputProps} />
    <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
      {icon}
    </span>
  </div>
));

DatePickerInput.displayName = "DatePickerInput";
