import { Wrapper, GOLD, BLUE, SKIN, HAIR } from "./_shared";
import type { IllustrationProps } from "./_shared";

export function EmptySprintIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>

      <circle cx="100" cy="100" r="78" fill={BLUE} opacity="0.03" />

      <rect x="14" y="40" width="48" height="100" rx="6" fill="white" stroke={BLUE} strokeWidth="2" />
      <rect x="14" y="40" width="48" height="18" rx="6" fill={BLUE} opacity="0.06" />
      <rect x="22" y="46" width="28" height="5" rx="2" fill={BLUE} opacity="0.2" />

      <rect x="20" y="66" width="36" height="18" rx="3" fill={GOLD} opacity="0.1" stroke={GOLD} strokeWidth="1" />
      <rect x="24" y="71" width="20" height="3" rx="1" fill={GOLD} opacity="0.2" />
      <rect x="20" y="90" width="36" height="18" rx="3" stroke={BLUE} strokeWidth="1" strokeDasharray="3 3" opacity="0.12" />

      <rect x="70" y="40" width="48" height="100" rx="6" fill="white" stroke={BLUE} strokeWidth="2" />
      <rect x="70" y="40" width="48" height="18" rx="6" fill={GOLD} opacity="0.06" />
      <rect x="78" y="46" width="28" height="5" rx="2" fill={GOLD} opacity="0.2" />

      <rect x="76" y="66" width="36" height="18" rx="3" fill={BLUE} opacity="0.08" stroke={BLUE} strokeWidth="1" />
      <rect x="80" y="71" width="24" height="3" rx="1" fill={BLUE} opacity="0.15" />

      <rect x="126" y="40" width="48" height="100" rx="6" fill="white" stroke={BLUE} strokeWidth="2" />
      <rect x="126" y="40" width="48" height="18" rx="6" fill={BLUE} opacity="0.04" />
      <rect x="134" y="46" width="28" height="5" rx="2" fill={BLUE} opacity="0.12" />

      <path d="M64 76h4" stroke={GOLD} strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <path d="M120 76h4" stroke={GOLD} strokeWidth="2" strokeLinecap="round" opacity="0.2" />

      <circle cx="94" cy="155" r="12" fill={SKIN} />
      <ellipse cx="94" cy="147" rx="10" ry="9" fill={HAIR} />
      <rect x="84" y="165" width="20" height="18" rx="5" fill={BLUE} />

      <path d="M104 170l16-26" stroke={SKIN} strokeWidth="4.5" strokeLinecap="round" />

      <circle cx="150" cy="32" r="3" fill={GOLD} opacity="0.25" />
      <path d="M158 28l2-4 2 4-2 4z" fill={GOLD} opacity="0.2" />
    </Wrapper>
  );
}
