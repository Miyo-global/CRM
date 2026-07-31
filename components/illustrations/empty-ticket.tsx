import { Wrapper, GOLD, BLUE, SKIN, HAIR } from "./_shared";
import type { IllustrationProps } from "./_shared";

export function EmptyTicketIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>

      <circle cx="100" cy="100" r="80" fill={BLUE} opacity="0.04" />

      <rect x="55" y="65" width="70" height="50" rx="6" fill="white" stroke={GOLD} strokeWidth="2" />
      <path d="M55 71 L90 95 L125 71" stroke={GOLD} strokeWidth="2" fill="none" />
      <rect x="70" y="80" width="30" height="3" rx="1.5" fill={BLUE} opacity="0.15" />
      <rect x="75" y="87" width="20" height="3" rx="1.5" fill={BLUE} opacity="0.1" />

      <path d="M130 100 L145 115 L140 115 L142 125 L137 125 L135 115 L130 115 Z" fill={GOLD} />

      <circle cx="155" cy="75" r="12" fill={SKIN} />
      <ellipse cx="155" cy="66" rx="10" ry="9" fill={HAIR} />
      <rect x="145" y="85" width="20" height="24" rx="5" fill={BLUE} />
      <rect x="147" y="109" width="6" height="18" rx="3" fill={BLUE} opacity="0.6" />
      <rect x="157" y="109" width="6" height="18" rx="3" fill={BLUE} opacity="0.6" />

      <circle cx="45" cy="90" r="3" fill={GOLD} opacity="0.2" />
      <circle cx="165" cy="135" r="4" fill={GOLD} opacity="0.15" />
    </Wrapper>
  );
}
