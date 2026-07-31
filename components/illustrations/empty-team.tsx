import { Wrapper, GOLD, BLUE, SKIN, HAIR } from "./_shared";
import type { IllustrationProps } from "./_shared";

export function EmptyTeamIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>

      <circle cx="100" cy="105" r="70" fill={BLUE} opacity="0.03" />

      <ellipse cx="100" cy="160" rx="70" ry="6" fill={BLUE} opacity="0.06" />

      <circle cx="100" cy="58" r="16" fill={SKIN} />
      <ellipse cx="100" cy="48" rx="14" ry="12" fill={HAIR} />
      <rect x="84" y="72" width="32" height="38" rx="8" fill={BLUE} />
      <rect x="90" y="110" width="8" height="30" rx="3" fill={BLUE} opacity="0.8" />
      <rect x="102" y="110" width="8" height="30" rx="3" fill={BLUE} opacity="0.8" />

      <circle cx="82" cy="92" r="5" fill={SKIN} />
      <circle cx="118" cy="92" r="5" fill={SKIN} />

      <circle cx="45" cy="78" r="12" fill={SKIN} opacity="0.7" />
      <ellipse cx="45" cy="70" rx="10" ry="9" fill={HAIR} opacity="0.7" />
      <rect x="33" y="88" width="24" height="30" rx="6" fill={GOLD} opacity="0.6" />
      <rect x="37" y="118" width="6" height="22" rx="2" fill={GOLD} opacity="0.4" />
      <rect x="45" y="118" width="6" height="22" rx="2" fill={GOLD} opacity="0.4" />

      <circle cx="155" cy="78" r="12" fill={SKIN} opacity="0.7" />
      <ellipse cx="155" cy="70" rx="10" ry="9" fill={HAIR} opacity="0.7" />
      <rect x="143" y="88" width="24" height="30" rx="6" fill={GOLD} opacity="0.6" />
      <rect x="147" y="118" width="6" height="22" rx="2" fill={GOLD} opacity="0.4" />
      <rect x="155" y="118" width="6" height="22" rx="2" fill={GOLD} opacity="0.4" />

      <path d="M68 80q16-10 32 0" stroke={GOLD} strokeWidth="1.5" strokeDasharray="4 3" fill="none" opacity="0.3" />
      <path d="M118 80q16-10 32 0" stroke={GOLD} strokeWidth="1.5" strokeDasharray="4 3" fill="none" opacity="0.3" />

      <circle cx="170" cy="65" r="10" fill={GOLD} opacity="0.15" />
      <line x1="170" y1="60" x2="170" y2="70" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
      <line x1="165" y1="65" x2="175" y2="65" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
    </Wrapper>
  );
}
