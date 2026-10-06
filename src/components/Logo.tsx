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
            <stop offset="0" stopColor="#ff3138" />
            <stop offset="1" stopColor="#d40810" />
          </linearGradient>
        </defs>
        <path fill="url(#savis-logo-red)" d="M14 11h35l-8.4 8.7H25.5l-5.1 5.1h18.8L50 35.2 39.8 45.5H16l8.5-8.7h11.8l4.4-4.3H22L11 21.5z" />
        <path fill="url(#savis-logo-red)" d="M50 53H15l8.3-8.6h15.2l5.1-5.1H25.1L14 28.9 24.3 18.6h23.4l-8.4 8.6H27.5l-4.5 4.4h18.9L53 42.5z" opacity=".92" />
      </svg>
      <div className="min-w-0">
        <div className={`savis-brand-name ${word}`}>SAVIS</div>
        {showTagline && <div className={`savis-brand-tagline ${tagline}`}><span>Services</span><i /> <span>Goods</span><i /> <span>People</span></div>}
      </div>
    </div>
  );
}
