import { Wrapper, GOLD, BLUE, SKIN, HAIR } from "./_shared";
import type { IllustrationProps } from "./_shared";

export function EmptyDevicesIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>

      <circle cx="100" cy="100" r="78" fill={BLUE} opacity="0.03" />

      <rect x="30" y="40" width="120" height="80" rx="6" fill="white" stroke={BLUE} strokeWidth="2" />

      <rect x="36" y="46" width="108" height="64" rx="3" fill={BLUE} opacity="0.04" />

      <rect x="44" y="54" width="40" height="6" rx="2" fill={GOLD} opacity="0.2" />
      <rect x="44" y="66" width="92" height="4" rx="2" fill={BLUE} opacity="0.08" />
      <rect x="44" y="76" width="72" height="4" rx="2" fill={BLUE} opacity="0.06" />
      <rect x="44" y="86" width="56" height="4" rx="2" fill={BLUE} opacity="0.04" />

      <circle cx="90" cy="43" r="1.5" fill={BLUE} opacity="0.2" />

      <path d="M20 120h140l-10 16H30l-10-16z" fill="white" stroke={BLUE} strokeWidth="2" strokeLinejoin="round" />
      <line x1="70" y1="128" x2="110" y2="128" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" opacity="0.2" />

      <circle cx="90" cy="122" r="2" fill={GOLD} opacity="0.4" />

      <circle cx="164" cy="68" r="12" fill={SKIN} />
      <ellipse cx="164" cy="60" rx="10" ry="9" fill={HAIR} />
      <rect x="154" y="78" width="20" height="24" rx="5" fill={GOLD} />
      <path d="M154 88l-6 10" stroke={SKIN} strokeWidth="4" strokeLinecap="round" />
      <rect x="156" y="102" width="6" height="18" rx="3" fill={BLUE} opacity="0.7" />
      <rect x="164" y="102" width="6" height="18" rx="3" fill={BLUE} opacity="0.7" />

      <path d="M28 52l2-4 2 4-4 0z" fill={GOLD} opacity="0.25" />
    </Wrapper>
  );
}
