import { cn } from "@/lib/utils";
import { GOLD, BLUE, SKIN, HAIR } from "./_shared";
import type { IllustrationProps } from "./_shared";

export function NotFoundIllustration({ className }: IllustrationProps) {
  return (
    <svg
      className={cn("w-64 h-64", className)}
      viewBox="0 0 400 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="200" cy="200" r="170" fill={BLUE} opacity="0.03" />
      <circle cx="200" cy="200" r="140" fill={GOLD} opacity="0.03" />

      <text
        x="200"
        y="230"
        textAnchor="middle"
        fill={BLUE}
        fontSize="130"
        fontWeight="900"
        opacity="0.04"
        fontFamily="Inter, sans-serif"
      >
        404
      </text>

      <circle cx="200" cy="175" r="65" fill="white" stroke={BLUE} strokeWidth="3" />
      <circle cx="200" cy="175" r="55" fill={BLUE} opacity="0.03" />
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const major = angle % 90 === 0;
        return (
          <line
            key={`cm-${angle}`}
            x1={200 + Math.cos(rad) * (major ? 48 : 51)}
            y1={175 + Math.sin(rad) * (major ? 48 : 51)}
            x2={200 + Math.cos(rad) * 55}
            y2={175 + Math.sin(rad) * 55}
            stroke={BLUE}
            strokeWidth={major ? 2.5 : 1.5}
            strokeLinecap="round"
            opacity={major ? 0.3 : 0.15}
          />
        );
      })}
      <line x1="200" y1="175" x2="185" y2="135" stroke={GOLD} strokeWidth="4" strokeLinecap="round" />
      <line x1="200" y1="175" x2="220" y2="210" stroke={BLUE} strokeWidth="3" strokeLinecap="round" opacity="0.3" />
      <circle cx="200" cy="175" r="6" fill={GOLD} />
      <circle cx="200" cy="175" r="3" fill="white" />
      <g opacity="0.15">
        <line x1="165" y1="140" x2="235" y2="210" stroke={BLUE} strokeWidth="5" strokeLinecap="round" />
        <line x1="235" y1="140" x2="165" y2="210" stroke={BLUE} strokeWidth="5" strokeLinecap="round" />
      </g>

      <circle cx="95" cy="200" r="22" fill={SKIN} />
      <ellipse cx="95" cy="186" rx="20" ry="16" fill={HAIR} />
      <circle cx="88" cy="200" r="2" fill={HAIR} />
      <circle cx="102" cy="200" r="2" fill={HAIR} />
      <path d="M88 210q7 3 14 0" stroke={HAIR} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <rect x="77" y="220" width="36" height="44" rx="10" fill={GOLD} />
      <path d="M113 230q12-20 8-36" stroke={SKIN} strokeWidth="7" strokeLinecap="round" fill="none" />
      <circle cx="118" cy="194" r="5" fill={SKIN} />
      <path d="M77 240l-14 16" stroke={SKIN} strokeWidth="7" strokeLinecap="round" />
      <rect x="82" y="264" width="10" height="32" rx="4" fill={BLUE} opacity="0.7" />
      <rect x="96" y="264" width="10" height="32" rx="4" fill={BLUE} opacity="0.7" />
      <ellipse cx="87" cy="298" rx="8" ry="4" fill={HAIR} />
      <ellipse cx="101" cy="298" rx="8" ry="4" fill={HAIR} />

      <text x="132" y="178" fill={GOLD} opacity="0.3" fontSize="22" fontWeight="bold">?</text>
      <text x="146" y="158" fill={GOLD} opacity="0.2" fontSize="16" fontWeight="bold">?</text>
      <text x="122" y="160" fill={GOLD} opacity="0.15" fontSize="12" fontWeight="bold">?</text>

      <path
        d="M280 280q20-20 30-10q10 10 30-5q20-15 30-5"
        stroke={BLUE}
        strokeWidth="3"
        strokeDasharray="8 6"
        fill="none"
        opacity="0.12"
        strokeLinecap="round"
      />
      <rect x="305" y="240" width="6" height="40" rx="2" fill={BLUE} opacity="0.15" />
      <rect x="290" y="232" width="36" height="18" rx="3" fill={GOLD} opacity="0.15" stroke={GOLD} strokeWidth="1.5" />
      <line x1="298" y1="241" x2="318" y2="241" stroke={GOLD} strokeWidth="2" strokeLinecap="round" opacity="0.2" />

      <circle cx="320" cy="140" r="4" fill={GOLD} opacity="0.15" />
      <circle cx="340" cy="160" r="2.5" fill={BLUE} opacity="0.1" />
      <circle cx="75" cy="310" r="3" fill={GOLD} opacity="0.12" />
      <path d="M60 155l3-5 3 5-3 5z" fill={GOLD} opacity="0.15" />
      <path d="M330 200l2-4 2 4-2 4z" fill={BLUE} opacity="0.1" />

      <ellipse cx="200" cy="320" rx="140" ry="8" fill={BLUE} opacity="0.04" />
    </svg>
  );
}
