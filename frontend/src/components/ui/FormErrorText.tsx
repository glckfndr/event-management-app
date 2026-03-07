import type { ReactNode } from "react";

type FormErrorTextProps = {
  children: ReactNode;
  className?: string;
};

export function FormErrorText({ children, className }: FormErrorTextProps) {
  return (
    <p className={`text-sm text-red-600 ${className ?? ""}`.trim()}>
      {children}
    </p>
  );
}
