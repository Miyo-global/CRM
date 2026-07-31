import { Wrapper, GOLD, BLUE, SKIN, HAIR } from "./_shared";
import type { IllustrationProps } from "./_shared";

export function EmptyExpensesIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>

      <ellipse cx="100" cy="110" rx="78" ry="55" fill={GOLD} opacity="0.04" />

      <path d="M55 25h90v130l-10-7-10 7-10-7-10 7-10-7-10 7-10-7-10 7V25z" fill="white" stroke={BLUE} strokeWidth="2" strokeLinejoin="round" />

      <rect x="55" y="25" width="90" height="22" fill={BLUE} opacity="0.06" />
      <line x1="75" y1="36" x2="125" y2="36" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.25" />

      <circle cx="100" cy="75" r="18" fill={GOLD} opacity="0.1" stroke={GOLD} strokeWidth="1.5" />
      <text x="100" y="81" textAnchor="middle" fill={GOLD} fontSize="18" fontWeight="bold">$</text>

      <line x1="70" y1="105" x2="130" y2="105" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" opacity="0.15" />
      <line x1="75" y1="117" x2="125" y2="117" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" opacity="0.12" />

      <line x1="65" y1="130" x2="135" y2="130" stroke={BLUE} strokeWidth="1" strokeDasharray="4 3" opacity="0.15" />
      <line x1="85" y1="140" x2="135" y2="140" stroke={GOLD} strokeWidth="2" strokeLinecap="round" opacity="0.3" />

      <circle cx="30" cy="82" r="13" fill={SKIN} />
      <ellipse cx="30" cy="73" rx="11" ry="10" fill={HAIR} />
      <rect x="18" y="93" width="24" height="28" rx="6" fill={BLUE} />
      <path d="M42 100l14 4" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />
      <rect x="21" y="121" width="7" height="22" rx="3" fill={BLUE} opacity="0.7" />
      <rect x="30" y="121" width="7" height="22" rx="3" fill={BLUE} opacity="0.7" />

      <ellipse cx="165" cy="138" rx="12" ry="4" fill={GOLD} opacity="0.2" />
      <ellipse cx="165" cy="134" rx="12" ry="4" fill={GOLD} opacity="0.25" />
      <ellipse cx="165" cy="130" rx="12" ry="4" fill={GOLD} opacity="0.3" stroke={GOLD} strokeWidth="1" />
    </Wrapper>
  );
}
