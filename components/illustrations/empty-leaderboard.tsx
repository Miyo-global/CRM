import { Wrapper, GOLD, BLUE, GOLD_LIGHT, SKIN, HAIR } from "./_shared";
import type { IllustrationProps } from "./_shared";

export function EmptyLeaderboardIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>

      <circle cx="100" cy="100" r="78" fill={BLUE} opacity="0.03" />

      <rect x="38" y="110" width="40" height="42" rx="3" fill={BLUE} opacity="0.06" />
      <rect x="38" y="110" width="40" height="6" rx="3" fill={BLUE} opacity="0.12" />
      <text x="58" y="138" fontSize="16" fill={BLUE} opacity="0.15" textAnchor="middle" fontWeight="bold">2</text>

      <rect x="82" y="90" width="40" height="62" rx="3" fill={GOLD} opacity="0.08" />
      <rect x="82" y="90" width="40" height="6" rx="3" fill={GOLD} opacity="0.2" />
      <text x="102" y="128" fontSize="16" fill={GOLD} opacity="0.25" textAnchor="middle" fontWeight="bold">1</text>

      <rect x="126" y="122" width="40" height="30" rx="3" fill={BLUE} opacity="0.04" />
      <rect x="126" y="122" width="40" height="6" rx="3" fill={BLUE} opacity="0.08" />
      <text x="146" y="146" fontSize="16" fill={BLUE} opacity="0.1" textAnchor="middle" fontWeight="bold">3</text>

      <g transform="translate(102, 68)">
        <path d="M-8 -14 L-6 0 Q-5 6 0 8 Q5 6 6 0 L8 -14 Z" fill={GOLD} />
        <rect x="-9" y="-16" width="18" height="3" rx="1.5" fill={GOLD_LIGHT} />
        <path d="M-8 -11 Q-14 -10 -14 -4 Q-14 2 -8 2" stroke={GOLD} strokeWidth="1.5" fill="none" />
        <path d="M8 -11 Q14 -10 14 -4 Q14 2 8 2" stroke={GOLD} strokeWidth="1.5" fill="none" />
        <rect x="-3" y="8" width="6" height="4" fill={GOLD} />
        <rect x="-5" y="12" width="10" height="2" rx="1" fill={GOLD} />
        <path d="M0 -10 L1.2 -6.5 L4.5 -6.5 L2 -4 L3 -0.5 L0 -2.5 L-3 -0.5 L-2 -4 L-4.5 -6.5 L-1.2 -6.5 Z" fill="white" opacity="0.6" />
      </g>

      <circle cx="58" cy="96" r="8" stroke={BLUE} strokeWidth="1.5" strokeDasharray="3 2" fill="none" opacity="0.2" />
      <path d="M50 108 Q52 118 52 126 L64 126 Q64 118 66 108 Q62 105 58 105 Q54 105 50 108Z" stroke={BLUE} strokeWidth="1.5" strokeDasharray="3 2" fill="none" opacity="0.2" />

      <circle cx="146" cy="108" r="8" stroke={BLUE} strokeWidth="1.5" strokeDasharray="3 2" fill="none" opacity="0.15" />
      <path d="M138 120 Q140 130 140 138 L152 138 Q152 130 154 120 Q150 117 146 117 Q142 117 138 120Z" stroke={BLUE} strokeWidth="1.5" strokeDasharray="3 2" fill="none" opacity="0.15" />

      <circle cx="25" cy="105" r="12" fill={SKIN} />
      <ellipse cx="25" cy="96" rx="10" ry="9" fill={HAIR} />
      <rect x="15" y="115" width="20" height="26" rx="5" fill={GOLD} />
      <rect x="17" y="141" width="6" height="18" rx="3" fill={BLUE} opacity="0.6" />
      <rect x="27" y="141" width="6" height="18" rx="3" fill={BLUE} opacity="0.6" />

      <path d="M170 70 L171.5 74 L176 74 L172.5 77 L174 81 L170 78 L166 81 L167.5 77 L164 74 L168.5 74 Z" fill={GOLD} opacity="0.15" />
      <circle cx="175" cy="95" r="2" fill={GOLD} opacity="0.1" />

      <ellipse cx="100" cy="160" rx="80" ry="5" fill={BLUE} opacity="0.04" />
    </Wrapper>
  );
}
