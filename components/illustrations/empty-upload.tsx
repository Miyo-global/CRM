import { Wrapper, GOLD, BLUE } from "./_shared";
import type { IllustrationProps } from "./_shared";

export function EmptyUploadIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>

      <circle cx="100" cy="100" r="80" fill={BLUE} opacity="0.04" />

      <ellipse cx="100" cy="80" rx="40" ry="25" fill="white" stroke={GOLD} strokeWidth="2" />
      <ellipse cx="75" cy="85" rx="20" ry="15" fill="white" stroke={GOLD} strokeWidth="2" />
      <ellipse cx="125" cy="85" rx="20" ry="15" fill="white" stroke={GOLD} strokeWidth="2" />
      <rect x="60" y="80" width="80" height="20" fill="white" />

      <path d="M100 105 L100 75" stroke={BLUE} strokeWidth="3" strokeLinecap="round" />
      <path d="M90 85 L100 73 L110 85" stroke={BLUE} strokeWidth="3" strokeLinecap="round" fill="none" />

      <rect x="60" y="120" width="22" height="28" rx="3" fill="white" stroke={GOLD} strokeWidth="1.5" />
      <rect x="65" y="126" width="12" height="2" rx="1" fill={BLUE} opacity="0.2" />
      <rect x="65" y="131" width="8" height="2" rx="1" fill={BLUE} opacity="0.15" />

      <rect x="90" y="118" width="22" height="28" rx="3" fill="white" stroke={GOLD} strokeWidth="1.5" />
      <rect x="95" y="124" width="12" height="2" rx="1" fill={BLUE} opacity="0.2" />
      <rect x="95" y="129" width="8" height="2" rx="1" fill={BLUE} opacity="0.15" />

      <rect x="120" y="120" width="22" height="28" rx="3" fill="white" stroke={GOLD} strokeWidth="1.5" />
      <rect x="125" y="126" width="12" height="2" rx="1" fill={BLUE} opacity="0.2" />
      <rect x="125" y="131" width="8" height="2" rx="1" fill={BLUE} opacity="0.15" />

      <circle cx="155" cy="115" r="10" fill={GOLD} opacity="0.15" />
      <line x1="150" y1="115" x2="160" y2="115" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
      <line x1="155" y1="110" x2="155" y2="120" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
    </Wrapper>
  );
}
