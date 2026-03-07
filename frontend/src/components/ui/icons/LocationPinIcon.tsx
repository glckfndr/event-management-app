import type { IconProps } from "../../../types/ui";

export function LocationPinIcon({ className }: IconProps) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M12 21C16 17 19 14 19 10.5C19 6.91015 15.866 4 12 4C8.13401 4 5 6.91015 5 10.5C5 14 8 17 12 21Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10.5" r="2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
