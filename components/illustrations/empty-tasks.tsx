import { Wrapper, GOLD, BLUE, SKIN, SKIN_SHADOW, HAIR } from "./_shared";
import type { IllustrationProps } from "./_shared";

export function EmptyTasksIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>

      <circle cx="100" cy="100" r="75" fill={GOLD} opacity="0.03" />

      <rect x="50" y="30" width="100" height="140" rx="10" fill="white" stroke={BLUE} strokeWidth="2" />
      <rect x="50" y="30" width="100" height="20" rx="10" fill={BLUE} opacity="0.06" />

      <rect x="75" y="20" width="50" height="20" rx="6" fill={BLUE} opacity="0.15" stroke={BLUE} strokeWidth="1.5" />
      <circle cx="100" cy="30" r="4" fill={BLUE} opacity="0.2" />

      <rect x="62" y="62" width="16" height="16" rx="4" fill={GOLD} opacity="0.15" stroke={GOLD} strokeWidth="1.5" />
      <path d="M66 70l4 4 8-8" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="86" y1="70" x2="136" y2="70" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.3" />

      <rect x="62" y="90" width="16" height="16" rx="4" stroke={BLUE} strokeWidth="1.5" opacity="0.25" />
      <line x1="86" y1="98" x2="128" y2="98" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.2" />

      <rect x="62" y="118" width="16" height="16" rx="4" stroke={BLUE} strokeWidth="1.5" opacity="0.15" />
      <line x1="86" y1="126" x2="120" y2="126" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.12" />

      <circle cx="32" cy="95" r="12" fill={SKIN} />
      <ellipse cx="32" cy="87" rx="10" ry="9" fill={HAIR} />
      <rect x="22" y="105" width="20" height="26" rx="5" fill={GOLD} />
      <path d="M42 112l10 6" stroke={SKIN} strokeWidth="4" strokeLinecap="round" />
      <rect x="24" y="131" width="7" height="20" rx="3" fill={BLUE} opacity="0.7" />
      <rect x="33" y="131" width="7" height="20" rx="3" fill={BLUE} opacity="0.7" />

      <g transform="translate(158, 55) rotate(25)">
        <rect width="6" height="40" rx="2" fill={GOLD} />
        <polygon points="0,40 6,40 3,48" fill={SKIN_SHADOW} />
      </g>
    </Wrapper>
  );
}
