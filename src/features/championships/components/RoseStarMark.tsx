/** Subtle Black Rose championship rosette — one mark per title won. */
export function RoseStarMark({
  className = "",
  size = 14,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M8 0.75L9.35 5.65L14.25 7L9.35 8.35L8 13.25L6.65 8.35L1.75 7L6.65 5.65L8 0.75Z"
        fill="currentColor"
        fillOpacity="0.92"
      />
      <path
        d="M8 4.25L8.65 6.35L10.75 7L8.65 7.65L8 9.75L7.35 7.65L5.25 7L7.35 6.35L8 4.25Z"
        fill="currentColor"
        fillOpacity="0.35"
      />
      <circle cx="8" cy="7" r="0.65" fill="currentColor" />
    </svg>
  );
}
