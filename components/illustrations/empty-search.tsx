import { Wrapper, GOLD, BLUE, GOLD_LIGHT, SKIN, HAIR } from "./_shared";
import type { IllustrationProps } from "./_shared";

export function EmptySearchIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>

      <circle cx="95" cy="100" r="78" fill={BLUE} opacity="0.03" />

      <circle cx="85" cy="78" r="36" fill="white" stroke={BLUE} strokeWidth="3" />
      <circle cx="85" cy="78" r="28" fill={BLUE} opacity="0.04" />

      <line x1="112" y1="105" x2="140" y2="133" stroke={GOLD} strokeWidth="6" strokeLinecap="round" />
      <line x1="112" y1="105" x2="140" y2="133" stroke={GOLD_LIGHT} strokeWidth="4" strokeLinecap="round" />

      <text x="85" y="88" textAnchor="middle" fill={BLUE} fontSize="28" fontWeight="bold" opacity="0.15">?</text>

      <circle cx="160" cy="55" r="13" fill={SKIN} />
      <ellipse cx="160" cy="46" rx="11" ry="10" fill={HAIR} />
      <rect x="148" y="66" width="24" height="30" rx="6" fill={BLUE} />
      <path d="M148 76l-14 14" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />
      <rect x="150" y="96" width="7" height="22" rx="3" fill={BLUE} opacity="0.7" />
      <rect x="161" y="96" width="7" height="22" rx="3" fill={BLUE} opacity="0.7" />

      <circle cx="40" cy="140" r="4" fill={GOLD} opacity="0.15" />
      <circle cx="55" cy="148" r="2.5" fill={BLUE} opacity="0.1" />
      <circle cx="30" cy="128" r="2" fill={GOLD} opacity="0.1" />

      <g opacity="0.2">
        <path d="M50 42l5 5M55 42l-5 5" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M28 68l4 4M32 68l-4 4" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </Wrapper>
  );
}
