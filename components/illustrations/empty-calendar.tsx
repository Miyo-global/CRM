import { Wrapper, GOLD, BLUE, SKIN, HAIR } from "./_shared";
import type { IllustrationProps } from "./_shared";

export function EmptyCalendarIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>

      <circle cx="100" cy="105" r="75" fill={GOLD} opacity="0.03" />

      <rect x="28" y="42" width="130" height="115" rx="8" fill="white" stroke={BLUE} strokeWidth="2" />

      <rect x="28" y="42" width="130" height="30" rx="8" fill={BLUE} opacity="0.08" />
      <rect x="28" y="62" width="130" height="10" fill={BLUE} opacity="0.08" />

      <line x1="62" y1="32" x2="62" y2="50" stroke={BLUE} strokeWidth="3.5" strokeLinecap="round" opacity="0.4" />
      <line x1="124" y1="32" x2="124" y2="50" stroke={BLUE} strokeWidth="3.5" strokeLinecap="round" opacity="0.4" />

      <rect x="70" y="48" width="46" height="6" rx="2" fill={BLUE} opacity="0.15" />

      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <rect key={`dh-${i}`} x={38 + i * 16} y="78" width="8" height="3" rx="1" fill={BLUE} opacity="0.15" />
      ))}

      {[0, 1, 2].map((row) =>
        [0, 1, 2, 3, 4, 5, 6].map((col) => (
          <rect
            key={`d-${row}-${col}`}
            x={36 + col * 16}
            y={90 + row * 18}
            width="12"
            height="12"
            rx="3"
            fill={row === 0 && col === 3 ? GOLD : BLUE}
            opacity={row === 0 && col === 3 ? 0.15 : 0.04}
          />
        ))
      )}

      <rect x="84" y="90" width="12" height="12" rx="3" stroke={GOLD} strokeWidth="1.5" fill="none" opacity="0.4" />

      <circle cx="174" cy="80" r="11" fill={SKIN} />
      <ellipse cx="174" cy="72" rx="9" ry="8" fill={HAIR} />
      <rect x="164" y="89" width="20" height="24" rx="5" fill={GOLD} />
      <rect x="166" y="113" width="6" height="18" rx="3" fill={BLUE} opacity="0.6" />
      <rect x="174" y="113" width="6" height="18" rx="3" fill={BLUE} opacity="0.6" />
    </Wrapper>
  );
}
