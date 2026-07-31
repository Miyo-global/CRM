import { Wrapper, GOLD, BLUE, SKIN, HAIR } from "./_shared";
import type { IllustrationProps } from "./_shared";

export function EmptyApprovalIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>
      <circle cx="100" cy="100" r="78" fill={BLUE} opacity="0.03" />

      <rect x="55" y="28" width="80" height="120" rx="8" fill="white" stroke={BLUE} strokeWidth="2" />
      <rect x="75" y="20" width="40" height="16" rx="5" fill={BLUE} opacity="0.12" stroke={BLUE} strokeWidth="1.5" />
      <circle cx="95" cy="28" r="3" fill={BLUE} opacity="0.15" />

      <rect x="68" y="48" width="14" height="14" rx="3" fill={GOLD} opacity="0.15" stroke={GOLD} strokeWidth="1.5" />
      <path d="M71 55l3 3 7-7" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="90" y1="55" x2="122" y2="55" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.25" />

      <rect x="68" y="72" width="14" height="14" rx="3" fill={GOLD} opacity="0.15" stroke={GOLD} strokeWidth="1.5" />
      <path d="M71 79l3 3 7-7" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="90" y1="79" x2="118" y2="79" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.2" />

      <rect x="68" y="96" width="14" height="14" rx="3" stroke={BLUE} strokeWidth="1.5" opacity="0.2" />
      <line x1="90" y1="103" x2="114" y2="103" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.12" />

      <rect x="68" y="118" width="14" height="14" rx="3" stroke={BLUE} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.12" />
      <line x1="90" y1="125" x2="108" y2="125" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.08" />

      <circle cx="160" cy="72" r="14" fill={SKIN} />
      <ellipse cx="160" cy="63" rx="12" ry="10" fill={HAIR} />
      <rect x="148" y="84" width="24" height="30" rx="6" fill={BLUE} />
      <path d="M148 94l-14 14" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />
      <g transform="translate(128, 110) rotate(-45)">
        <rect width="4" height="22" rx="1.5" fill={GOLD} />
        <polygon points="0,22 4,22 2,26" fill={GOLD} opacity="0.7" />
      </g>
      <rect x="150" y="114" width="7" height="22" rx="3" fill={BLUE} opacity="0.7" />
      <rect x="161" y="114" width="7" height="22" rx="3" fill={BLUE} opacity="0.7" />

      <circle cx="42" cy="130" r="16" fill={GOLD} opacity="0.1" stroke={GOLD} strokeWidth="1.5" />
      <path d="M34 130l5 5 11-11" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      <circle cx="45" cy="42" r="3" fill={GOLD} opacity="0.2" />
      <path d="M170 48l2-4 2 4-2 4z" fill={GOLD} opacity="0.2" />

      <ellipse cx="100" cy="155" rx="70" ry="4" fill={BLUE} opacity="0.04" />
    </Wrapper>
  );
}
