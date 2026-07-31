import { Wrapper, GOLD, BLUE, SKIN, HAIR } from "./_shared";
import type { IllustrationProps } from "./_shared";

export function EmptyDocumentsIllustration({ className }: IllustrationProps) {
  return (
    <Wrapper className={className}>

      <circle cx="105" cy="100" r="72" fill={BLUE} opacity="0.03" />

      <rect x="62" y="28" width="85" height="110" rx="6" fill={BLUE} opacity="0.06" stroke={BLUE} strokeWidth="1" />

      <rect x="52" y="38" width="85" height="110" rx="6" fill="white" stroke={BLUE} strokeWidth="1.5" opacity="0.4" />

      <rect x="42" y="48" width="85" height="110" rx="6" fill="white" stroke={BLUE} strokeWidth="2" />

      <path d="M107 48l20 20h-14a6 6 0 01-6-6V48z" fill={GOLD} opacity="0.1" stroke={BLUE} strokeWidth="1.5" />

      <line x1="56" y1="80" x2="112" y2="80" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.2" />
      <line x1="56" y1="94" x2="100" y2="94" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.15" />
      <line x1="56" y1="108" x2="90" y2="108" stroke={BLUE} strokeWidth="2" strokeLinecap="round" opacity="0.12" />

      <circle cx="98" cy="135" r="10" fill={GOLD} opacity="0.15" stroke={GOLD} strokeWidth="1.5" />
      <path d="M93 135l3 3 7-7" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      <circle cx="160" cy="78" r="14" fill={SKIN} />
      <ellipse cx="160" cy="68" rx="12" ry="10" fill={HAIR} />
      <rect x="148" y="90" width="24" height="30" rx="6" fill={BLUE} />
      <path d="M148 100l-20 8" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />
      <rect x="150" y="120" width="8" height="25" rx="3" fill={BLUE} opacity="0.8" />
      <rect x="160" y="120" width="8" height="25" rx="3" fill={BLUE} opacity="0.8" />
    </Wrapper>
  );
}
