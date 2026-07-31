import { Wrapper, GOLD, BLUE, GOLD_LIGHT, SKIN, HAIR } from "./_shared";
import type { IllustrationProps } from "./_shared";

export function EmptyInboxIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>

      <circle cx="100" cy="100" r="80" fill={BLUE} opacity="0.04" />

      <rect x="40" y="80" width="120" height="70" rx="8" fill="white" stroke={BLUE} strokeWidth="2" />
      <path d="M40 105h35l8-15h34l8 15h35" stroke={BLUE} strokeWidth="2" strokeLinejoin="round" fill="none" />
      <rect x="40" y="80" width="120" height="25" rx="8" fill={BLUE} opacity="0.06" />

      <g transform="translate(75, 30) rotate(-8)">
        <rect width="50" height="35" rx="4" fill={GOLD_LIGHT} opacity="0.2" stroke={GOLD} strokeWidth="1.5" />
        <path d="M0 4l25 16 25-16" stroke={GOLD} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </g>

      <circle cx="148" cy="62" r="12" fill={SKIN} />
      <circle cx="148" cy="56" r="14" fill={HAIR} />
      <ellipse cx="148" cy="50" rx="10" ry="6" fill={HAIR} />
      <rect x="138" y="72" width="20" height="18" rx="4" fill={BLUE} />

      <circle cx="55" cy="50" r="3" fill={GOLD} opacity="0.3" />
      <circle cx="165" cy="40" r="2" fill={GOLD} opacity="0.4" />
      <path d="M42 65l3-3 3 3-3 3z" fill={GOLD} opacity="0.25" />

      <line x1="60" y1="120" x2="140" y2="120" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.15" />
      <line x1="70" y1="132" x2="130" y2="132" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.1" />
    </Wrapper>
  );
}
