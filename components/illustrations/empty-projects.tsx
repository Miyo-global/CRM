import { Wrapper, GOLD, BLUE, SKIN, HAIR } from "./_shared";
import type { IllustrationProps } from "./_shared";

export function EmptyProjectsIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>

      <ellipse cx="100" cy="110" rx="75" ry="50" fill={BLUE} opacity="0.04" />

      <path d="M30 65h50l10-15h70a6 6 0 016 6v80a6 6 0 01-6 6H30a6 6 0 01-6-6V71a6 6 0 016-6z" fill={BLUE} opacity="0.08" stroke={BLUE} strokeWidth="2" />

      <rect x="24" y="75" width="152" height="67" rx="6" fill="white" stroke={BLUE} strokeWidth="2" />

      <rect x="24" y="75" width="152" height="8" rx="4" fill={GOLD} opacity="0.15" />

      <circle cx="100" cy="38" r="14" fill={SKIN} />
      <ellipse cx="100" cy="30" rx="12" ry="10" fill={HAIR} />
      <rect x="88" y="50" width="24" height="28" rx="6" fill={GOLD} />

      <path d="M88 58l-16 14" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />
      <path d="M112 58l16 14" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />

      <circle cx="100" cy="110" r="14" fill={GOLD} opacity="0.12" />
      <line x1="100" y1="102" x2="100" y2="118" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" />
      <line x1="92" y1="110" x2="108" y2="110" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" />

      <circle cx="45" cy="100" r="3" fill={BLUE} opacity="0.1" />
      <circle cx="155" cy="95" r="2" fill={GOLD} opacity="0.2" />
    </Wrapper>
  );
}
