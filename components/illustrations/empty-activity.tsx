import { Wrapper, GOLD, BLUE, SKIN, HAIR } from "./_shared";
import type { IllustrationProps } from "./_shared";

export function EmptyActivityIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>

      <circle cx="100" cy="100" r="78" fill={BLUE} opacity="0.03" />

      <line x1="60" y1="30" x2="60" y2="175" stroke={BLUE} strokeWidth="2" opacity="0.12" />

      <circle cx="60" cy="50" r="8" fill={GOLD} opacity="0.2" stroke={GOLD} strokeWidth="1.5" />
      <circle cx="60" cy="50" r="3" fill={GOLD} opacity="0.5" />
      <rect x="78" y="42" width="80" height="16" rx="4" fill={BLUE} opacity="0.06" stroke={BLUE} strokeWidth="1" />
      <line x1="86" y1="50" x2="148" y2="50" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.2" />

      <circle cx="60" cy="90" r="8" fill="white" stroke={BLUE} strokeWidth="1.5" opacity="0.3" />
      <rect x="78" y="82" width="70" height="16" rx="4" fill={BLUE} opacity="0.04" stroke={BLUE} strokeWidth="1" />
      <line x1="86" y1="90" x2="138" y2="90" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.12" />

      <circle cx="60" cy="130" r="8" fill="white" stroke={BLUE} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.2" />
      <rect x="78" y="122" width="60" height="16" rx="4" stroke={BLUE} strokeWidth="1" strokeDasharray="4 3" opacity="0.06" />

      <circle cx="160" cy="100" r="14" fill={SKIN} />
      <ellipse cx="160" cy="90" rx="12" ry="10" fill={HAIR} />
      <rect x="148" y="112" width="24" height="30" rx="6" fill={GOLD} />

      <rect x="137" y="118" width="14" height="18" rx="2" fill="white" stroke={BLUE} strokeWidth="1" />
      <line x1="140" y1="124" x2="148" y2="124" stroke={BLUE} strokeWidth="1" strokeLinecap="round" opacity="0.3" />
      <line x1="140" y1="129" x2="146" y2="129" stroke={BLUE} strokeWidth="1" strokeLinecap="round" opacity="0.2" />
      <rect x="150" y="142" width="7" height="22" rx="3" fill={BLUE} opacity="0.7" />
      <rect x="161" y="142" width="7" height="22" rx="3" fill={BLUE} opacity="0.7" />
    </Wrapper>
  );
}
