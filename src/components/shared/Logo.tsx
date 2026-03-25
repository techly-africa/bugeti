import { cn } from "@/lib/utils";

interface LogoProps {
  /** "full" = icon + wordmark, "icon" = icon only, "wordmark" = text only */
  variant?: "full" | "icon" | "wordmark";
  /** "dark" = green on white (default), "light" = white on dark */
  color?: "dark" | "light";
  className?: string;
  /** Height in px — width scales proportionally */
  height?: number;
}

/** Inline SVG logo — zero network request, instant render, works offline. */
export function Logo({
  variant = "full",
  color = "dark",
  className,
  height = 40,
}: LogoProps) {
  const green     = color === "dark" ? "#0D5C36" : "white";
  const greenMid  = color === "dark" ? "#1A7A4A" : "rgba(255,255,255,0.15)";
  const tagline   = color === "dark" ? "#5A9E78" : "rgba(255,255,255,0.55)";
  const iconBg    = color === "dark"
    ? "url(#bgGrad)"
    : "rgba(255,255,255,0.12)";
  const iconStroke = color === "dark" ? undefined : "rgba(255,255,255,0.3)";

  /** Icon mark only (72×80 viewBox) */
  const IconMark = (
    <svg
      viewBox="0 0 72 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ height, width: "auto" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1A7A4A" />
          <stop offset="100%" stopColor="#0D5C36" />
        </linearGradient>
        <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFD95A" />
          <stop offset="100%" stopColor="#E6A820" />
        </linearGradient>
        <filter id="iconShadow" x="-15%" y="-10%" width="130%" height="130%">
          <feDropShadow
            dx="0" dy="2" stdDeviation="2.5"
            floodColor="#0D5C36" floodOpacity="0.18"
          />
        </filter>
        <clipPath id="iconClip">
          <rect x="0" y="4" width="72" height="72" rx="18" />
        </clipPath>
      </defs>

      {/* Background */}
      <rect
        x="0" y="4" width="72" height="72" rx="18"
        fill={iconBg}
        stroke={iconStroke}
        strokeWidth={iconStroke ? 1.5 : 0}
        filter={color === "dark" ? "url(#iconShadow)" : undefined}
      />

      {/* R letterform + gold strokes — clipped to rounded square */}
      <g clipPath="url(#iconClip)">
        {/* Left stem */}
        <line
          x1="20" y1="18" x2="20" y2="62"
          stroke="white" strokeWidth="9" strokeLinecap="square"
        />
        {/* Upper bowl */}
        <path
          d="M20 18 Q52 18 52 31 Q52 44 20 44"
          stroke="white" strokeWidth="8" fill="none"
          strokeLinecap="butt" strokeLinejoin="round"
        />
        {/* Diagonal leg */}
        <line
          x1="22" y1="43" x2="52" y2="62"
          stroke="white" strokeWidth="8" strokeLinecap="round"
        />
        {/* Two gold vertical strokes through R */}
        <line
          x1="31" y1="10" x2="31" y2="72"
          stroke="url(#goldGrad)" strokeWidth="4.5" strokeLinecap="round"
        />
        <line
          x1="41" y1="10" x2="41" y2="72"
          stroke="url(#goldGrad)" strokeWidth="4.5" strokeLinecap="round"
        />
      </g>
    </svg>
  );

  if (variant === "icon") return (
    <span className={cn("inline-flex items-center", className)}>
      {IconMark}
    </span>
  );

  if (variant === "wordmark") return (
    <span className={cn("inline-flex flex-col justify-center", className)}>
      <svg
        viewBox="0 0 160 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ height, width: "auto" }}
      >
        <text
          x="0" y="32"
          fontFamily="'Inter', 'Helvetica Neue', Arial, sans-serif"
          fontSize="36"
          fontWeight="800"
          letterSpacing="-1"
          fill={green}
        >
          bugeti
        </text>
      </svg>
    </span>
  );

  /** Full logo: icon + wordmark + tagline */
  const wordmarkH = height;
  const iconH     = height;

  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      {IconMark}
      <svg
        viewBox="0 0 200 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ height: wordmarkH, width: "auto" }}
      >
        <text
          x="0" y="36"
          fontFamily="'Inter', 'Helvetica Neue', Arial, sans-serif"
          fontSize="36"
          fontWeight="800"
          letterSpacing="-1"
          fill={green}
        >
          bugeti
        </text>
        <text
          x="2" y="52"
          fontFamily="'Inter', 'Helvetica Neue', Arial, sans-serif"
          fontSize="10"
          fontWeight="400"
          letterSpacing="2.8"
          fill={tagline}
        >
          MANAGE YOUR MONEY
        </text>
      </svg>
    </span>
  );
}
