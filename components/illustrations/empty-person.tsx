import { Wrapper, GOLD, BLUE, SKIN, HAIR } from "./_shared";
import type { IllustrationProps } from "./_shared";

export function EmptyPersonIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>

      <circle cx="100" cy="100" r="78" fill={BLUE} opacity="0.03" />

      <circle cx="100" cy="72" r="30" fill={BLUE} opacity="0.05" stroke={BLUE} strokeWidth="2" strokeDasharray="6 4" />
      <text x="100" y="82" textAnchor="middle" fill={BLUE} fontSize="32" fontWeight="bold" opacity="0.1">?</text>

      <path d="M65 140a35 35 0 0170 0" fill={BLUE} opacity="0.05" stroke={BLUE} strokeWidth="2" strokeDasharray="6 4" />

      <circle cx="44" cy="88" r="13" fill={SKIN} />
      <ellipse cx="44" cy="79" rx="11" ry="10" fill={HAIR} />
      <rect x="32" y="99" width="24" height="28" rx="6" fill={GOLD} />

      <path d="M56 105l14-6" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />
      <rect x="34" y="127" width="7" height="22" rx="3" fill={BLUE} opacity="0.7" />
      <rect x="45" y="127" width="7" height="22" rx="3" fill={BLUE} opacity="0.7" />

      <circle cx="150" cy="108" r="16" fill="white" stroke={GOLD} strokeWidth="2" />
      <line x1="161" y1="119" x2="174" y2="132" stroke={GOLD} strokeWidth="3.5" strokeLinecap="round" />

      <circle cx="168" cy="60" r="3" fill={GOLD} opacity="0.2" />
      <path d="M175 72l2-3 2 3-2 3z" fill={BLUE} opacity="0.15" />
    </Wrapper>
  );
}
