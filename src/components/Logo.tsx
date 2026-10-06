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
        {/* Bold geometric S matching the brand lockup design */}
        <path
          fill="url(#savis-logo-red)"
          d="M12 14c0-3.3 2.7-6 6-6h28c3.3 0 6 2.7 6 6s-2.7 6-6 6H28c-1.1 0-2 .9-2 2s.9 2 2 2h18c3.3 0 6 2.7 6 6s-2.7 6-6 6H18c-3.3 0-6-2.7-6-6s2.7-6 6-6h18c1.1 0 2-.9 2-2s-.9-2-2-2H18c-3.3 0-6-2.7-6-6z"
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
