import { Wrapper, GOLD, BLUE, SKIN, HAIR } from "./_shared";
import type { IllustrationProps } from "./_shared";

export function EmptyLeaveIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>

      <circle cx="100" cy="100" r="78" fill={GOLD} opacity="0.03" />

      <rect x="40" y="45" width="110" height="100" rx="8" fill="white" stroke={BLUE} strokeWidth="2" />
      <rect x="40" y="45" width="110" height="28" rx="8" fill={BLUE} opacity="0.06" />
      <rect x="40" y="65" width="110" height="8" fill={BLUE} opacity="0.06" />

      <line x1="70" y1="36" x2="70" y2="52" stroke={BLUE} strokeWidth="3" strokeLinecap="round" opacity="0.4" />
      <line x1="120" y1="36" x2="120" y2="52" stroke={BLUE} strokeWidth="3" strokeLinecap="round" opacity="0.4" />

      <rect x="75" y="52" width="40" height="5" rx="2" fill={BLUE} opacity="0.15" />

      {[0, 1, 2, 3, 4].map((col) => (
        <rect key={`r1-${col}`} x={50 + col * 18} y={82} width="12" height="12" rx="3" fill={BLUE} opacity="0.04" />
      ))}
      {[0, 1, 2, 3, 4].map((col) => (
        <rect key={`r2-${col}`} x={50 + col * 18} y={102} width="12" height="12" rx="3" fill={BLUE} opacity="0.04" />
      ))}

      <circle cx="160" cy="50" r="14" fill={GOLD} opacity="0.12" />
      <circle cx="160" cy="50" r="8" fill={GOLD} opacity="0.2" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <line
            key={`ray-${angle}`}
            x1={160 + Math.cos(rad) * 10}
            y1={50 + Math.sin(rad) * 10}
            x2={160 + Math.cos(rad) * 14}
            y2={50 + Math.sin(rad) * 14}
            stroke={GOLD}
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.3"
          />
        );
      })}

      <circle cx="160" cy="105" r="12" fill={SKIN} />
      <ellipse cx="160" cy="96" rx="10" ry="9" fill={HAIR} />
      <rect x="150" y="115" width="20" height="24" rx="5" fill={GOLD} />
      <rect x="152" y="139" width="6" height="18" rx="3" fill={BLUE} opacity="0.6" />
      <rect x="162" y="139" width="6" height="18" rx="3" fill={BLUE} opacity="0.6" />
    </Wrapper>
  );
}
