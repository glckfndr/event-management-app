import type { ReactNode } from "react";
import { FormErrorText } from "./FormErrorText";

type FormFieldProps = {
  label: ReactNode;
  htmlFor?: string;
  required?: boolean;
  errorMessage?: string;
  hint?: ReactNode;
  className?: string;
  labelClassName?: string;
  children: ReactNode;
};

export function FormField({
  label,
  htmlFor,
  required,
  errorMessage,
  hint,
  className,
  labelClassName,
  children,
}: FormFieldProps) {
  return (
    <div className={className ?? "grid gap-2"}>
      <label
        htmlFor={htmlFor}
        className={
          labelClassName ?? "text-[1.05rem] font-semibold text-slate-800"
        }
      >
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>

      {children}

      {errorMessage ? <FormErrorText>{errorMessage}</FormErrorText> : null}
      {hint ?? null}
    </div>
  );
}
