import { Wrapper, GOLD, BLUE, SKIN, HAIR } from "./_shared";
import type { IllustrationProps } from "./_shared";

export function EmptyMailIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>

      <circle cx="100" cy="100" r="78" fill={GOLD} opacity="0.03" />

      <rect x="30" y="60" width="140" height="90" rx="8" fill="white" stroke={BLUE} strokeWidth="2" />
      <path d="M30 68l70 42 70-42" stroke={BLUE} strokeWidth="2" fill="none" strokeLinejoin="round" />
      <rect x="30" y="60" width="140" height="16" rx="8" fill={BLUE} opacity="0.06" />

      <path d="M30 60l70 38 70-38" stroke={BLUE} strokeWidth="2" fill="white" strokeLinejoin="round" />

      <circle cx="100" cy="125" r="12" fill={GOLD} opacity="0.15" stroke={GOLD} strokeWidth="1.5" />
      <path d="M95 125l3 3 7-7" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      <circle cx="160" cy="38" r="13" fill={SKIN} />
      <ellipse cx="160" cy="29" rx="11" ry="10" fill={HAIR} />
      <rect x="148" y="49" width="24" height="28" rx="6" fill={GOLD} />

      <path d="M172 55l12-12" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />
      <circle cx="184" cy="43" r="4" fill={SKIN} />
      <rect x="150" y="77" width="7" height="20" rx="3" fill={BLUE} opacity="0.7" />
      <rect x="161" y="77" width="7" height="20" rx="3" fill={BLUE} opacity="0.7" />

      <circle cx="45" cy="45" r="3" fill={GOLD} opacity="0.2" />
      <path d="M55 38l2-4 2 4-2 4z" fill={BLUE} opacity="0.15" />
      <circle cx="135" cy="35" r="2" fill={GOLD} opacity="0.15" />
    </Wrapper>
  );
}
