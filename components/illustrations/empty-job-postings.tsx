import { Wrapper, GOLD, BLUE } from "./_shared";
import type { IllustrationProps } from "./_shared";

/** Empty state for job postings / recruitment lists. */
export function EmptyJobPostingsIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      <circle cx="100" cy="100" r="78" fill={BLUE} opacity="0.04" />

      {/* Listing board */}
      <rect x="52" y="44" width="96" height="118" rx="8" fill="white" stroke={BLUE} strokeWidth="2" />
      <rect x="52" y="44" width="96" height="28" rx="8" fill={BLUE} opacity="0.08" />
      <path d="M52 64h96" stroke={BLUE} strokeWidth="2" opacity="0.15" />

      <line x1="68" y1="88" x2="132" y2="88" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" opacity="0.2" />
      <line x1="68" y1="104" x2="118" y2="104" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" opacity="0.14" />
      <line x1="68" y1="120" x2="108" y2="120" stroke={BLUE} strokeWidth="2.5" strokeLinecap="round" opacity="0.1" />

      <circle cx="100" cy="132" r="8" fill={GOLD} opacity="0.2" />
      <path d="M96 132l2.5 2.5 6-6" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Briefcase */}
      <rect x="118" y="118" width="52" height="38" rx="6" fill="white" stroke={BLUE} strokeWidth="1.8" />
      <path d="M128 118v-6a10 10 0 0110-10h4a10 10 0 0110 10v6" stroke={BLUE} strokeWidth="1.8" fill="none" />
      <rect x="138" y="132" width="12" height="10" rx="2" fill={GOLD} opacity="0.25" stroke={GOLD} strokeWidth="1.2" />
    </Wrapper>
  );
}
