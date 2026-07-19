/** Rupee Radar mark: sweep radar with ₹ center and amber blip (option R1). */
export default function RadarLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle
        cx="24"
        cy="24"
        r="11.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity=".4"
      />
      <path d="M24 24 L24 4 A20 20 0 0 1 41.3 14 Z" fill="currentColor" opacity=".18" />
      <line
        x1="24"
        y1="24"
        x2="41.3"
        y2="14"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="32.5" cy="11.5" r="3" fill="#f59e0b" />
      <text
        x="24"
        y="30.5"
        textAnchor="middle"
        fontSize="17"
        fontWeight="800"
        fill="currentColor"
        fontFamily="inherit"
      >
        ₹
      </text>
    </svg>
  );
}
