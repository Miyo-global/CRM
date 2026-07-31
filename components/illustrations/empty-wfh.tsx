import { Wrapper, GOLD, BLUE, SKIN, HAIR } from "./_shared";
import type { IllustrationProps } from "./_shared";

export function EmptyWfhIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      <circle cx="100" cy="100" r="78" fill={GOLD} opacity="0.03" />

      <rect x="120" y="22" width="50" height="40" rx="4" fill="white" stroke={BLUE} strokeWidth="1.5" />
      <line x1="120" y1="32" x2="170" y2="32" stroke={BLUE} strokeWidth="1.5" opacity="0.2" />
      <circle cx="145" cy="27" r="2" fill={GOLD} opacity="0.3" />
      <line x1="145" y1="32" x2="145" y2="62" stroke={BLUE} strokeWidth="1" opacity="0.1" />
      <line x1="120" y1="47" x2="170" y2="47" stroke={BLUE} strokeWidth="1" opacity="0.1" />
      <circle cx="155" cy="42" r="5" fill={GOLD} opacity="0.25" />
      {[0, 60, 120, 180, 240, 300].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <line
            key={`ws-${angle}`}
            x1={155 + Math.cos(rad) * 7}
            y1={42 + Math.sin(rad) * 7}
            x2={155 + Math.cos(rad) * 9}
            y2={42 + Math.sin(rad) * 9}
            stroke={GOLD}
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.2"
          />
        );
      })}

      <rect x="20" y="115" width="120" height="6" rx="2" fill={BLUE} opacity="0.12" />
      <rect x="30" y="121" width="6" height="30" rx="2" fill={BLUE} opacity="0.08" />
      <rect x="124" y="121" width="6" height="30" rx="2" fill={BLUE} opacity="0.08" />

      <rect x="45" y="92" width="60" height="23" rx="3" fill="white" stroke={BLUE} strokeWidth="2" />
      <rect x="50" y="97" width="50" height="14" rx="2" fill={BLUE} opacity="0.05" />
      <rect x="54" y="100" width="18" height="3" rx="1" fill={GOLD} opacity="0.25" />
      <rect x="54" y="106" width="30" height="2" rx="1" fill={BLUE} opacity="0.1" />
      <path d="M40 115h70l-4-5H44l-4 5z" fill={BLUE} opacity="0.08" stroke={BLUE} strokeWidth="1.5" />

      <rect x="115" y="103" width="12" height="12" rx="2" fill="white" stroke={GOLD} strokeWidth="1.5" />
      <path d="M127 107a4 4 0 010 6" stroke={GOLD} strokeWidth="1" fill="none" />
      <path d="M118 100q1-3 3 0" stroke={GOLD} strokeWidth="0.8" fill="none" opacity="0.3" />
      <path d="M122 98q1-4 3 0" stroke={GOLD} strokeWidth="0.8" fill="none" opacity="0.2" />

      <circle cx="75" cy="60" r="14" fill={SKIN} />
      <ellipse cx="75" cy="51" rx="12" ry="10" fill={HAIR} />
      <rect x="63" y="72" width="24" height="28" rx="6" fill={GOLD} />
      <path d="M63 82l-10 18" stroke={SKIN} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M87 82l10 18" stroke={SKIN} strokeWidth="4.5" strokeLinecap="round" />
      <rect x="65" y="100" width="8" height="20" rx="3" fill={BLUE} opacity="0.7" />
      <rect x="77" y="100" width="8" height="20" rx="3" fill={BLUE} opacity="0.7" />

      <rect x="148" y="98" width="10" height="17" rx="3" fill={GOLD} opacity="0.2" />
      <circle cx="153" cy="92" r="8" fill="#4ade80" opacity="0.2" />
      <circle cx="148" cy="88" r="5" fill="#4ade80" opacity="0.15" />

      <g transform="translate(28, 50)" opacity="0.2">
        <path d="M6 14a2 2 0 100-4 2 2 0 000 4z" fill={BLUE} />
        <path d="M0 6a9 9 0 0112 0" stroke={BLUE} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M2 9a6 6 0 018 0" stroke={BLUE} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </g>

      <ellipse cx="80" cy="158" rx="70" ry="4" fill={BLUE} opacity="0.04" />
    </Wrapper>
  );
}
