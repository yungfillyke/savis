import type { CategoryIconId } from "@/lib/categories";

type Props = { id: CategoryIconId; className?: string };

/** Compact line icons for category circles — no emojis */
export default function CategoryIcon({ id, className = "" }: Props) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: `savis-cat-icon ${className}`,
    "aria-hidden": true as const,
  };

  switch (id) {
    case "home":
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5.5 9.5V21h13V9.5" />
          <path d="M10 21v-6h4v6" />
        </svg>
      );
    case "briefcase":
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="13" rx="2" />
          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M3 12h18" />
        </svg>
      );
    case "car":
      return (
        <svg {...common}>
          <path d="M3 14h18v4a1 1 0 0 1-1 1h-1a2 2 0 0 1-4 0H8a2 2 0 0 1-4 0H3a1 1 0 0 1-1-1v-4Z" />
          <path d="M5 14 6.5 8.5A2 2 0 0 1 8.4 7h7.2a2 2 0 0 1 1.9 1.5L19 14" />
        </svg>
      );
    case "box":
      return (
        <svg {...common}>
          <path d="M21 8v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8" />
          <path d="M3 8 12 3l9 5" />
          <path d="M12 13v8" />
          <path d="M3 8h18" />
        </svg>
      );
    case "plumbing":
      return (
        <svg {...common}>
          <path d="M12 3v6" />
          <path d="M9 9h6" />
          <path d="M8 9a4 4 0 0 0 8 0" />
          <path d="M12 13v8" />
          <path d="M9 21h6" />
        </svg>
      );
    case "electrical":
      return (
        <svg {...common}>
          <path d="M13 2 6 13h5l-1 9 8-12h-5l1-8Z" />
        </svg>
      );
    case "masonry":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="7" height="5" rx="0.5" />
          <rect x="12" y="4" width="9" height="5" rx="0.5" />
          <rect x="3" y="10.5" width="9" height="5" rx="0.5" />
          <rect x="14" y="10.5" width="7" height="5" rx="0.5" />
          <rect x="3" y="17" width="7" height="5" rx="0.5" />
          <rect x="12" y="17" width="9" height="5" rx="0.5" />
        </svg>
      );
    case "carpentry":
      return (
        <svg {...common}>
          <path d="M14.5 4.5 19 9l-9.5 9.5L5 14z" />
          <path d="M11 7.5 16.5 13" />
          <path d="M5 19h6" />
        </svg>
      );
    case "welding":
      return (
        <svg {...common}>
          <path d="M3 18h7" />
          <path d="M6.5 18 12 6l3 6 3-3 3 9" />
          <path d="M14 12l2 6" />
        </svg>
      );
    case "cleaning":
      return (
        <svg {...common}>
          <path d="M5 21h14" />
          <path d="M12 3v10" />
          <path d="M8 8h8" />
          <path d="M9 13c0 2 1.5 4 3 5 1.5-1 3-3 3-5" />
        </svg>
      );
    case "painting":
      return (
        <svg {...common}>
          <path d="M12 3v7" />
          <path d="M8 10h8l-1 3H9z" />
          <path d="M10 13v5a2 2 0 0 0 4 0v-5" />
        </svg>
      );
    case "legal":
      return (
        <svg {...common}>
          <path d="M12 3v18" />
          <path d="M5 8h14" />
          <path d="M6 8 3 14h6z" />
          <path d="M18 8l3 6h-6z" />
          <path d="M9 21h6" />
        </svg>
      );
    case "finance":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v10" />
          <path d="M9.5 9.5c.5-1 1.5-1.5 2.5-1.5 1.5 0 2.5.8 2.5 2s-1 2-2.5 2-2.5.8-2.5 2 1 2 2.5 2c1 0 2-.5 2.5-1.5" />
        </svg>
      );
    case "insurance":
      return (
        <svg {...common}>
          <path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case "tech":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="12" rx="2" />
          <path d="M8 21h8" />
          <path d="M12 17v4" />
        </svg>
      );
    case "realestate":
      return (
        <svg {...common}>
          <path d="M3 21h18" />
          <path d="M5 21V9l7-5 7 5v12" />
          <path d="M10 21v-5h4v5" />
        </svg>
      );
    case "mechanic":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
        </svg>
      );
    case "haulage":
      return (
        <svg {...common}>
          <path d="M1 16h15V7H1z" />
          <path d="M16 10h4l3 4v2h-7" />
          <circle cx="5.5" cy="17.5" r="1.5" />
          <circle cx="18.5" cy="17.5" r="1.5" />
        </svg>
      );
    case "materials":
      return (
        <svg {...common}>
          <path d="M3 18h18" />
          <path d="M5 18V9l4-4h6l4 4v9" />
          <path d="M9 18v-5h6v5" />
        </svg>
      );
    case "supplies":
      return (
        <svg {...common}>
          <path d="M4 9h16v11H4z" />
          <path d="M8 9V6a4 4 0 0 1 8 0v3" />
          <path d="M4 13h16" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}
