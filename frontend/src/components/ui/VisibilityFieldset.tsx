import type { ReactNode } from "react";
import { FormErrorText } from "./FormErrorText";

type VisibilityFieldsetProps = {
  legend?: string;
  publicControl: ReactNode;
  privateControl: ReactNode;
  errorMessage?: string;
  className?: string;
};

export function VisibilityFieldset({
  legend = "Visibility",
  publicControl,
  privateControl,
  errorMessage,
  className,
}: VisibilityFieldsetProps) {
  return (
    <fieldset className={className ?? "grid gap-2"}>
      <legend className="text-[1.05rem] font-semibold text-slate-800">
        {legend}
      </legend>

      <label className="flex items-center gap-2 text-[1.05rem] text-slate-700">
        {publicControl}
        Public - Anyone can see and join this event
      </label>

      <label className="flex items-center gap-2 text-[1.05rem] text-slate-700">
        {privateControl}
        Private - Only invited people can see this event
      </label>

      {errorMessage ? <FormErrorText>{errorMessage}</FormErrorText> : null}
    </fieldset>
  );
}
