import { Wrapper, GOLD, BLUE, SKIN, HAIR } from "./_shared";
import type { IllustrationProps } from "./_shared";

export function EmptyTimeIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>

      <circle cx="95" cy="95" r="78" fill={GOLD} opacity="0.03" />

      <circle cx="100" cy="88" r="52" fill="white" stroke={BLUE} strokeWidth="2.5" />
      <circle cx="100" cy="88" r="46" fill={BLUE} opacity="0.03" />

      <circle cx="100" cy="88" r="52" stroke={GOLD} strokeWidth="1" strokeDasharray="6 14" opacity="0.3" />

      <circle cx="100" cy="88" r="4" fill={BLUE} />

      <line x1="100" y1="88" x2="100" y2="56" stroke={BLUE} strokeWidth="3" strokeLinecap="round" />

      <line x1="100" y1="88" x2="130" y2="78" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />

      <line x1="100" y1="40" x2="100" y2="46" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
      <line x1="148" y1="88" x2="142" y2="88" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
      <line x1="100" y1="136" x2="100" y2="130" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
      <line x1="52" y1="88" x2="58" y2="88" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />

      <circle cx="38" cy="120" r="11" fill={SKIN} />
      <ellipse cx="38" cy="112" rx="9" ry="8" fill={HAIR} />
      <rect x="28" y="130" width="20" height="22" rx="5" fill={GOLD} />
      <rect x="30" y="152" width="7" height="18" rx="3" fill={BLUE} opacity="0.6" />
      <rect x="39" y="152" width="7" height="18" rx="3" fill={BLUE} opacity="0.6" />

      <text x="54" y="108" fill={GOLD} opacity="0.35" fontSize="10" fontWeight="bold">z</text>
      <text x="60" y="100" fill={GOLD} opacity="0.25" fontSize="8" fontWeight="bold">z</text>
      <text x="64" y="94" fill={GOLD} opacity="0.15" fontSize="6" fontWeight="bold">z</text>
    </Wrapper>
  );
}
