#!/bin/bash
D="app components features hooks lib"

echo "1 hex: $(grep -rnE --include='*.tsx' --include='*.ts' '#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b' $D | grep -vE 'lib/design/brand-hex.ts|lib/db/|QR_(FG|BG)' | grep -vE '^\S+:\s*//' | wc -l)"
echo "2 rgb: $(grep -rnE --include='*.tsx' --include='*.ts' '(rgba?|hsla?)\(' $D | grep -v 'lib/design/' | wc -l)"
echo "3 arb-color: $(grep -rnE --include='*.tsx' --include='*.ts' '(bg|text|border|from|to|via|fill|stroke|ring|shadow|outline|decoration)-\[(#|rgb|hsl)' $D | wc -l)"
echo "4 palette: $(grep -rnE --include='*.tsx' --include='*.ts' '\b(bg|text|border|from|to|via|ring|fill|stroke|divide|outline|shadow|decoration|placeholder|accent|caret)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}' $D | wc -l)"
echo "5 legacy: $(grep -rnE --include='*.tsx' --include='*.ts' --include='*.css' '\b(glass|gold-gradient|gold-text|gold-border|shadow-soft|shadow-medium|shadow-noir|shadow-gold|glow-gold|press-scale|noir-mesh|noir-grain|auth-bg|deco-line|deco-line-subtle|sidebar-deco|gradient-gold|gradient-brand|gradient-green|gradient-wizard|gradient-dark|nav-item|filter-chip|page-enter|vc-toast[a-z-]*|kanban-scroll-container)\b|(text|bg|border|ring|from|to|via|fill|stroke|outline|shadow)-gold\b|-gold/|--gold\b|--blue\b|selection:' $D globals.css $(ls -d styles 2>/dev/null) | wc -l)"
echo "6 fonts: $(grep -rnE 'Playfair|JetBrains|family=Inter|"Inter"|font-inter|font-serif|fonts.googleapis' app components features lib globals.css $(ls -d styles 2>/dev/null) | wc -l)"
echo "7 arb-size: $(grep -rnE --include='*.tsx' --include='*.ts' 'text-\[[0-9.]+(px|rem)\]|rounded-\[|shadow-\[|z-\[[0-9]+\]' $D | wc -l)"
echo "8 bw: $(grep -rnE --include='*.tsx' '\b(bg|text|border|from|to|via)-(white|black)\b' $D | wc -l)"
echo "9 dark: $(grep -rnoE --include='*.tsx' --include='*.ts' 'dark:' $D | wc -l)  files-outside-ui: $(grep -rlE --include='*.tsx' --include='*.ts' 'dark:' $D | grep -v '^components/ui/' | wc -l)"
echo "10 oldhex: $(grep -rniE '#(bd882c|d4a23a|c8a22e|0f2b7f|1e3a8a|0f1120|0d0f1a|161825|1a1d2e|f8f8fc)\b' app components features lib globals.css $(ls -d styles 2>/dev/null) | wc -l)"
