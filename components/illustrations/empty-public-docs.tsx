import { Wrapper, GOLD, BLUE, SKIN, HAIR } from "./_shared";
import type { IllustrationProps } from "./_shared";

export function EmptyPublicDocsIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>

      <circle cx="100" cy="100" r="80" fill={BLUE} opacity="0.04" />

      <rect x="55" y="55" width="55" height="70" rx="5" fill="white" stroke={BLUE} strokeWidth="1.5" opacity="0.5" transform="rotate(-5 82.5 90)" />
      <rect x="60" y="52" width="55" height="70" rx="5" fill="white" stroke={GOLD} strokeWidth="2" />

      <rect x="70" y="65" width="35" height="3" rx="1.5" fill={BLUE} opacity="0.2" />
      <rect x="70" y="73" width="28" height="3" rx="1.5" fill={BLUE} opacity="0.15" />
      <rect x="70" y="81" width="32" height="3" rx="1.5" fill={BLUE} opacity="0.1" />

      <circle cx="92" cy="100" r="10" fill="none" stroke={GOLD} strokeWidth="2" />
      <ellipse cx="92" cy="100" rx="5" ry="10" fill="none" stroke={GOLD} strokeWidth="1.5" />
      <line x1="82" y1="100" x2="102" y2="100" stroke={GOLD} strokeWidth="1.5" />

      <circle cx="145" cy="80" r="12" fill={SKIN} />
      <ellipse cx="145" cy="71" rx="10" ry="9" fill={HAIR} />
      <rect x="135" y="90" width="20" height="24" rx="5" fill={GOLD} />
      <line x1="135" y1="100" x2="120" y2="90" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
      <rect x="137" y="114" width="6" height="18" rx="3" fill={BLUE} opacity="0.6" />
      <rect x="147" y="114" width="6" height="18" rx="3" fill={BLUE} opacity="0.6" />

      <circle cx="50" cy="130" r="3" fill={GOLD} opacity="0.2" />
      <circle cx="160" cy="60" r="4" fill={BLUE} opacity="0.15" />
    </Wrapper>
  );
}
