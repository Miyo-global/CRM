import { Wrapper, GOLD, BLUE, SKIN, HAIR } from "./_shared";
import type { IllustrationProps } from "./_shared";

export function EmptyTargetIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>

      <circle cx="100" cy="100" r="78" fill={GOLD} opacity="0.03" />

      <rect x="128" y="70" width="3" height="85" rx="1.5" fill={BLUE} opacity="0.15" />
      <rect x="115" y="150" width="30" height="4" rx="2" fill={BLUE} opacity="0.12" />

      <circle cx="130" cy="60" r="38" fill="white" stroke={BLUE} strokeWidth="2" />
      <circle cx="130" cy="60" r="30" fill="none" stroke={GOLD} strokeWidth="2" opacity="0.25" />
      <circle cx="130" cy="60" r="22" fill="none" stroke={GOLD} strokeWidth="2" opacity="0.4" />
      <circle cx="130" cy="60" r="14" fill="none" stroke={GOLD} strokeWidth="2" opacity="0.6" />
      <circle cx="130" cy="60" r="5" fill={GOLD} />

      <g transform="translate(148, 38) rotate(30)">
        <line x1="0" y1="0" x2="28" y2="0" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        <polygon points="-2,-3 5,0 -2,3" fill={BLUE} opacity="0.5" />
        <line x1="24" y1="-3" x2="28" y2="0" stroke={GOLD} strokeWidth="1" opacity="0.5" />
        <line x1="24" y1="3" x2="28" y2="0" stroke={GOLD} strokeWidth="1" opacity="0.5" />
      </g>

      <circle cx="58" cy="78" r="14" fill={SKIN} />
      <ellipse cx="58" cy="69" rx="12" ry="10" fill={HAIR} />
      <rect x="46" y="90" width="24" height="30" rx="6" fill={BLUE} />

      <path d="M70 98l20-12" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />

      <path d="M46 98l-8-16" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />
      <circle cx="38" cy="82" r="4" fill={SKIN} />

      <rect x="49" y="120" width="7" height="22" rx="3" fill={BLUE} opacity="0.7" />
      <rect x="58" y="120" width="7" height="22" rx="3" fill={BLUE} opacity="0.7" />

      <text x="72" y="72" fill={GOLD} opacity="0.35" fontSize="12" fontWeight="bold">?</text>
      <text x="80" y="62" fill={GOLD} opacity="0.2" fontSize="9" fontWeight="bold">?</text>

      <circle cx="30" cy="120" r="3" fill={GOLD} opacity="0.15" />
      <circle cx="170" cy="45" r="2" fill={BLUE} opacity="0.12" />
      <ellipse cx="100" cy="155" rx="70" ry="4" fill={BLUE} opacity="0.04" />
    </Wrapper>
  );
}
