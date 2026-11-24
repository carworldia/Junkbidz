// The app mark: a small truck on a rounded square in the brand color. Keep in sync with public/icon.svg.
export default function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false"
      style={{ color: "var(--brand)", flex: "none" }}>
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <g fill="none" stroke="var(--brand-ink)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
        <path d="M6 10h11v10H6zM17 13.5h4.5L25 17v3h-8" />
      </g>
      <circle cx="10" cy="21.5" r="2.2" fill="var(--brand-ink)" />
      <circle cx="21" cy="21.5" r="2.2" fill="var(--brand-ink)" />
    </svg>
  );
}
