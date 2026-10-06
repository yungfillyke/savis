type LogoProps = { size?: "sm" | "md" | "lg"; showTagline?: boolean };

export default function Logo({ size = "md", showTagline = true }: LogoProps) {
  const mark = size === "lg" ? 58 : size === "sm" ? 42 : 50;
  const word = size === "lg" ? "text-[2rem]" : size === "sm" ? "text-[1.45rem]" : "text-[1.7rem]";
  const tagline = size === "lg" ? "text-[0.62rem]" : "text-[0.48rem]";

  return (
    <div className="savis-brand-lockup" aria-label="SAVIS — Services, Goods, People">
      <svg width={mark} height={mark} viewBox="0 0 64 64" aria-hidden="true" className="savis-brand-mark">
        <defs>
          <linearGradient id="savis-logo-red" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff2a32" />
            <stop offset="1" stopColor="#c7080c" />
          </linearGradient>
        </defs>
        {/* Bold angular S mark matching the SAVIS brand lockup */}
        <path
          fill="url(#savis-logo-red)"
          d="M46.8 11.2H22.4c-6.6 0-11.2 3.4-11.2 9.2 0 4.6 2.8 7.4 8.2 8.6l16.4 3.6c2.4.6 3.6 1.6 3.6 3.4 0 2.4-2.2 3.8-5.8 3.8H17.2v7.6h25.2c6.8 0 11.6-3.6 11.6-9.6 0-4.8-2.8-7.6-8.4-8.8l-16.2-3.4c-2.4-.6-3.6-1.6-3.6-3.4 0-2.2 2-3.6 5.4-3.6h24.6v-7.4z"
        />
      </svg>
      <div className="min-w-0">
        <div className={`savis-brand-name ${word}`}>SAVIS</div>
        {showTagline && (
          <div className={`savis-brand-tagline ${tagline}`}>
            <span>Services</span>
            <i />
            <span>Goods</span>
            <i />
            <span>People</span>
          </div>
        )}
      </div>
    </div>
  );
}
