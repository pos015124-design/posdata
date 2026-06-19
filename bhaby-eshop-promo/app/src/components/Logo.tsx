/**
 * Logo — E-Shop Bhaby Group brand mark
 * Identical to the main platform logo (client/src/components/Logo.tsx)
 *
 * Variants:
 *   full  — icon + "E-SHOP / BHABY GROUP" text (default)
 *   icon  — icon only
 *   white — full logo forced white (for dark backgrounds)
 */

interface LogoProps {
  variant?: "full" | "icon" | "white";
  className?: string;
}

function BIcon({
  color1 = "#0ea5e9",
  color2 = "#1e3a5f",
  size = 48,
}: {
  color1?: string;
  color2?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Outer B shape */}
      <path
        d="M18 10 L18 90 L55 90 C72 90 82 80 82 67 C82 58 77 52 69 49 C76 46 80 40 80 32 C80 19 70 10 55 10 Z"
        stroke={color1}
        strokeWidth="5"
        fill="none"
        strokeLinejoin="round"
      />
      {/* Upper bump */}
      <path
        d="M18 10 L55 10 C68 10 78 18 78 30 C78 42 68 49 55 49 L18 49"
        stroke={color1}
        strokeWidth="5"
        fill="none"
      />
      {/* Lower bump */}
      <path
        d="M18 49 L57 49 C71 49 82 57 82 68 C82 79 71 88 57 88 L18 88"
        stroke={color2}
        strokeWidth="5"
        fill="none"
      />
      {/* Circuit traces */}
      <line x1="18" y1="30" x2="6" y2="30" stroke={color1} strokeWidth="3" strokeLinecap="round" />
      <circle cx="4" cy="30" r="3" fill={color1} />
      <line x1="18" y1="50" x2="6" y2="50" stroke={color1} strokeWidth="3" strokeLinecap="round" />
      <circle cx="4" cy="50" r="3" fill={color1} />
      <line x1="18" y1="70" x2="6" y2="70" stroke={color2} strokeWidth="3" strokeLinecap="round" />
      <circle cx="4" cy="70" r="3" fill={color2} />
      {/* Shopping cart inside B */}
      <g transform="translate(36, 38)">
        <path
          d="M2 4 L4 4 L7 14 L18 14 L20 7 L6 7"
          stroke={color1}
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="9" cy="17" r="1.8" fill={color1} />
        <circle cx="16" cy="17" r="1.8" fill={color1} />
      </g>
    </svg>
  );
}

export default function Logo({ variant = "full", className = "" }: LogoProps) {
  const isWhite  = variant === "white";
  const iconOnly = variant === "icon";

  const teal       = isWhite ? "#ffffff" : "#0ea5e9";
  const navy       = isWhite ? "#ffffff" : "#1e3a5f";
  const eshopColor = isWhite ? "#ffffff" : "#0ea5e9";
  const groupColor = isWhite ? "#ffffff" : "#1e3a5f";

  if (iconOnly) {
    return (
      <span className={`inline-flex items-center ${className}`}>
        <BIcon color1={teal} color2={navy} size={40} />
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <BIcon color1={teal} color2={navy} size={44} />
      <span className="flex flex-col leading-none select-none">
        <span
          className="font-black tracking-[0.18em] text-sm"
          style={{ color: eshopColor, fontFamily: "inherit" }}
        >
          E-SHOP
        </span>
        <span
          className="font-extrabold tracking-[0.06em] text-lg leading-tight"
          style={{ color: groupColor, fontFamily: "inherit" }}
        >
          BHABY GROUP
        </span>
      </span>
    </span>
  );
}
