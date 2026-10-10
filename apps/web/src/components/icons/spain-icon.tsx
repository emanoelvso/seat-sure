// Figma's export draws the coat of arms with 576 vector paths (~500 KB), far
// too heavy for a 24x16 flag. The bands are exported as-is; the crest is a
// simplified redraw (crown, shield, two pillars) in the same colors.
export function SpainIcon() {
  return (
    <svg
      width="24"
      height="16"
      viewBox="0 0 24 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#clip0_10387_414)">
        <path d="M0 0H24V16H0V0Z" fill="#AA151B" />
        <path d="M0 4H24V12H0V4Z" fill="#F1BF00" />
        <path d="M5.6 6.8H10.2V7.5H5.6V6.8Z" fill="#C8B100" />
        <path d="M6.5 5.2H9.3L9.6 6.8H6.2L6.5 5.2Z" fill="#C8B100" />
        <path d="M6.1 7H9.7V9.6C9.7 10.3 8.9 10.9 7.9 10.9C6.9 10.9 6.1 10.3 6.1 9.6V7Z" fill="#AD1519" />
        <path d="M7.9 7H9.7V9H7.9V7Z" fill="white" />
        <path d="M6.1 7H7.1V10.4H6.1V7Z" fill="#C8B100" />
        <path d="M7.5 8.2H8.3V9H7.5V8.2Z" fill="#005BBF" />
        <path d="M4.7 6.9H5.3V10.9H4.7V6.9Z" fill="white" />
        <path d="M10.5 6.9H11.1V10.9H10.5V6.9Z" fill="white" />
        <path d="M4.5 6.4H5.5V6.9H4.5V6.4Z" fill="#C8B100" />
        <path d="M10.3 6.4H11.3V6.9H10.3V6.4Z" fill="#C8B100" />
        <path d="M4.6 10.9H5.4V11.3H4.6V10.9Z" fill="#005BBF" />
        <path d="M10.4 10.9H11.2V11.3H10.4V10.9Z" fill="#005BBF" />
      </g>
      <defs>
        <clipPath id="clip0_10387_414">
          <rect width="24" height="16" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
}
