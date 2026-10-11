#!/usr/bin/env python3
"""Mechanical class migration for the Gold & Ink revamp (docs/CRM-UI-UX-REVAMP.md §5).

Rewrites Tailwind class tokens inside .ts/.tsx files:
  * raw palette colors (emerald-500/10, text-red-700, ...) -> tone tokens
  * paired `dark:` color variants -> dropped (tokens switch themselves)
  * legacy helpers (shadow-noir, gold-gradient, text-gold, ...) -> new utilities
  * arbitrary text-[Npx] / z-[N] -> scale tokens

Usage: python3 scripts/ui-revamp-codemod.py [--dry] <file-or-dir>...
Only touches tokens that look like Tailwind classes (optionally prefixed by
variants such as hover:, group-hover:, data-[state=open]:).
"""
import os
import re
import sys

FAMILY_TONE = {
    "emerald": "success", "green": "success", "lime": "success",
    "red": "danger", "rose": "danger",
    "amber": "warning", "orange": "warning", "yellow": "warning",
    "blue": "info", "sky": "info", "indigo": "info",
    "cyan": "teal", "teal": "teal",
    "purple": "plum", "violet": "plum", "fuchsia": "plum", "pink": "plum",
    "slate": "neutral", "gray": "neutral", "zinc": "neutral", "stone": "neutral", "neutral": "neutral",
}
FAMILIES = "|".join(sorted(FAMILY_TONE, key=len, reverse=True))
PROPS = "bg|text|border|from|to|via|ring|fill|stroke|divide|outline|shadow|decoration|placeholder|accent|caret|border-l|border-r|border-t|border-b|border-x|border-y|ring-offset"

# A class token: optional variant chain, optional "!" important, property, family, shade, optional /opacity
TOKEN = re.compile(
    r"(?P<pre>(?<![\w-]))(?P<variants>(?:[\w\-\[\]=&\.\*>:@/()]+?:)*)(?P<imp>!?)"
    r"(?P<prop>" + PROPS + r")-(?P<fam>" + FAMILIES + r")-(?P<shade>50|[1-9]00|950)"
    r"(?:/(?P<op>\d{1,3}|\[[^\]]+\]))?(?![\w-])"
)

SCALE = {"success": "success", "danger": "danger", "warning": "warning", "info": "info", "teal": "teal", "plum": "plum", "neutral": "ink"}


def neutral_map(prop, shade, op):
    """Greys map onto semantic surface/text tokens."""
    s = int(shade)
    if prop in ("text", "placeholder", "caret", "decoration"):
        if s <= 300:
            return "text-subtle-foreground" if prop == "text" else f"{prop}-subtle-foreground"
        if s <= 400:
            return "text-subtle-foreground" if prop == "text" else f"{prop}-subtle-foreground"
        if s <= 600:
            return "text-muted-foreground" if prop == "text" else f"{prop}-muted-foreground"
        if s == 700:
            return "text-neutral-strong" if prop == "text" else f"{prop}-neutral-strong"
        return "text-foreground" if prop == "text" else f"{prop}-foreground"
    if prop == "bg":
        if op is not None:
            return "bg-neutral-soft"
        if s <= 100:
            return "bg-muted"
        if s <= 300:
            return "bg-ink-200"
        if s <= 500:
            return "bg-ink-400"
        if s <= 700:
            return "bg-ink-700"
        return "bg-ink-900"
    if prop.startswith("border") or prop in ("divide", "ring", "outline"):
        if s <= 200:
            return f"{prop}-border"
        if s <= 400:
            return f"{prop}-border-strong"
        return f"{prop}-ink-500"
    # gradients, fill, stroke, shadow, accent
    return f"{prop}-ink-{shade}" + (f"/{op}" if op else "")


def tone_map(prop, tone, shade, op):
    s = int(shade)
    scale = SCALE[tone]
    if tone == "neutral":
        return neutral_map(prop, shade, op)
    if prop in ("text", "placeholder", "caret", "decoration"):
        if s >= 300 or prop != "text":
            return f"{prop}-{tone}-strong"
        return f"{prop}-{tone}-strong"
    if prop == "bg":
        if op is not None:
            o = int(op) if op.isdigit() else 10
            return f"bg-{tone}-soft" if o <= 25 else f"bg-{scale}-500/{op}"
        if s <= 100:
            return f"bg-{tone}-soft"
        if s <= 300:
            return f"bg-{scale}-{shade}"
        # solid status fills
        return f"bg-{scale}-{shade}"
    if prop.startswith("border") or prop in ("divide", "ring", "outline", "ring-offset"):
        if op is not None:
            return f"{prop}-{tone}-strong/{op}" if op.isdigit() and int(op) <= 40 else f"{prop}-{scale}-{shade}/{op}"
        if s <= 300:
            return f"{prop}-{tone}-strong/25"
        return f"{prop}-{scale}-{shade}"
    return f"{prop}-{scale}-{shade}" + (f"/{op}" if op else "")


def is_dark_color_variant(variants):
    return "dark:" in variants


def replace_palette(text):
    def sub(m):
        variants, imp, prop, fam, shade, op = (
            m.group("variants"), m.group("imp"), m.group("prop"), m.group("fam"), m.group("shade"), m.group("op"))
        if is_dark_color_variant(variants):
            return "\x00DROP\x00"
        tone = FAMILY_TONE[fam]
        new = tone_map(prop, tone, shade, op)
        return f"{variants}{imp}{new}"

    out = TOKEN.sub(sub, text)
    # drop dark: color tokens and collapse the whitespace they leave
    return drop_marks(out)


DARK_COLOR = re.compile(
    r"(?<![\w-])(?:[\w\-\[\]=&:]+:)*dark:(?:[\w\-\[\]=&]+:)*!?"
    r"(?:bg|text|border(?:-[lrtbxy])?|ring(?:-offset)?|from|to|via|fill|stroke|divide|outline|placeholder|shadow|decoration|caret|accent)"
    r"-[\w\-\[\]/.#%(),]+(?![\w-])")


def drop_marks(text):
    text = re.sub(r"[ \t]+\x00DROP\x00", "", text)
    text = re.sub(r"\x00DROP\x00[ \t]*", "", text)
    return text


def drop_dark_colors(text):
    return drop_marks(DARK_COLOR.sub("\x00DROP\x00", text))


LEGACY = [
    (r"(?<![\w-])hover:shadow-\[0_0_20px_rgba\(200,162,46,0\.3\)\]", "hover:shadow-md"),
    (r"(?<![\w-])shadow-noir(?![\w-])", "shadow-sm"),
    (r"(?<![\w-])shadow-soft(?![\w-])", "shadow-sm"),
    (r"(?<![\w-])shadow-medium(?![\w-])", "shadow-md"),
    (r"(?<![\w-])shadow-gold(?![\w-])", "shadow-md"),
    (r"(?<![\w-])hover:glow-gold(?![\w-])", "hover:shadow-md"),
    (r"(?<![\w-])glow-gold(?![\w-])", "hover:shadow-md hover:border-border-strong"),
    (r"(?<![\w-])gold-gradient(?![\w-])", "bg-primary text-primary-foreground"),
    (r"(?<![\w-])gold-text(?![\w-])", "text-brand-text"),
    (r"(?<![\w-])gold-border(?![\w-])", "border-primary"),
    (r"(?<![\w-])gradient-gold(?![\w-])", "bg-primary"),
    (r"(?<![\w-])gradient-wizard(?![\w-])", "bg-primary"),
    (r"(?<![\w-])gradient-brand(?![\w-])", "brand-mark-bg"),
    (r"(?<![\w-])gradient-green(?![\w-])", "bg-success"),
    (r"(?<![\w-])gradient-dark(?![\w-])", "brand-mark-bg"),
    (r"(?<![\w-])noir-mesh(?![\w-])", "bg-background"),
    (r"(?<![\w-])noir-grain(?![\w-])", ""),
    (r"(?<![\w-])auth-bg(?![\w-])", "brand-mark-bg"),
    (r"(?<![\w-])press-scale(?![\w-])", "active:scale-[0.98] transition-transform duration-100"),
    (r"(?<![\w-])page-enter(?![\w-])", "animate-fade-up"),
    (r"(?<![\w-])kanban-scroll-container(?![\w-])", "kanban-scroll"),
    (r"(?<![\w-])deco-line-subtle(?![\w-])", "h-px bg-border"),
    (r"(?<![\w-])deco-line(?![\w-])", "h-px bg-border"),
    (r"(?<![\w-])sidebar-deco(?![\w-])", "h-px bg-sidebar-border"),
    (r"(?<![\w-])font-serif(?![\w-])", "font-display"),
    (r"(?<![\w-])selection:bg-gold/\d+(?![\w-])", ""),
    (r"(?<![\w-])selection:text-gold(?![\w-])", ""),
    # gold token utilities
    (r"(?<![\w-])((?:[\w\-\[\]=&:]+:)*)text-gold(?:/\d+)?(?![\w-])", r"\1text-brand-text"),
    (r"(?<![\w-])((?:[\w\-\[\]=&:]+:)*)bg-gold/(?:\d+)(?![\w-])", r"\1bg-brand-soft"),
    (r"(?<![\w-])((?:[\w\-\[\]=&:]+:)*)bg-gold(?![\w/-])", r"\1bg-primary"),
    (r"(?<![\w-])((?:[\w\-\[\]=&:]+:)*)(border(?:-[lrtbxy])?)-gold(?:/\d+)?(?![\w-])", r"\1\2-primary/40"),
    (r"(?<![\w-])((?:[\w\-\[\]=&:]+:)*)(ring(?:-offset)?)-gold(?:/\d+)?(?![\w-])", r"\1\2-ring"),
    (r"(?<![\w-])((?:[\w\-\[\]=&:]+:)*)(from|to|via)-gold(?:/\d+)?(?![\w-])", r"\1\2-gold-400"),
    (r"(?<![\w-])((?:[\w\-\[\]=&:]+:)*)(fill|stroke|outline|decoration|shadow|accent|caret)-gold(?:/\d+)?(?![\w-])", r"\1\2-gold-400"),
    (r"(?<![\w-])((?:[\w\-\[\]=&:]+:)*)bg-white(?:/\d+)?(?![\w-])", r"\1bg-card"),
    (r"(?<![\w-])((?:[\w\-\[\]=&:]+:)*)bg-black/\d+(?![\w-])", r"\1bg-overlay"),
    (r"(?<![\w-])((?:[\w\-\[\]=&:]+:)*)text-black(?:/\d+)?(?![\w-])", r"\1text-foreground"),
    # retired navy "blue" brand token
    (r"(?<![\w-])((?:[\w\-\[\]=&:]+:)*)(text|bg|border|ring|from|to|via)-blue(?:/\d+)?(?![\w-])", r"\1\2-secondary"),
]

SIZE_MAP = {
    "7px": "text-3xs", "8px": "text-3xs", "9px": "text-3xs", "10px": "text-2xs", "11px": "text-2xs",
    "12px": "text-xs", "13px": "text-sm", "14px": "text-sm", "15px": "text-base", "16px": "text-base",
    "17px": "text-lg", "18px": "text-lg", "20px": "text-xl", "22px": "text-xl", "24px": "text-2xl",
    "28px": "text-3xl", "30px": "text-3xl", "32px": "text-3xl", "36px": "text-4xl", "40px": "text-4xl",
    "0.625rem": "text-3xs", "0.6875rem": "text-2xs", "0.75rem": "text-xs", "0.8125rem": "text-sm",
    "0.875rem": "text-sm", "0.9375rem": "text-base", "1rem": "text-base", "1.125rem": "text-lg",
    "1.25rem": "text-xl", "1.5rem": "text-2xl", "1.75rem": "text-3xl", "2rem": "text-3xl",
    "2.25rem": "text-4xl", "2.5rem": "text-4xl", "2.75rem": "text-4xl", "3rem": "text-5xl", "3.5rem": "text-5xl",
}
Z_MAP = {"5": "z-base", "10": "z-sticky", "20": "z-sticky", "30": "z-sidebar", "40": "z-topbar", "45": "z-topbar",
         "50": "z-dropdown", "60": "z-overlay", "70": "z-modal", "80": "z-popover", "90": "z-toast",
         "99": "z-modal", "100": "z-modal", "200": "z-skip-link", "999": "z-toast", "9999": "z-toast"}
RADIUS_PX = [(4, "rounded-xs"), (6, "rounded-sm"), (8, "rounded-md"), (10, "rounded-lg"), (14, "rounded-xl"), (20, "rounded-2xl")]


def nearest_radius(px):
    return min(RADIUS_PX, key=lambda r: abs(r[0] - px))[1]


def replace_misc(text):
    text = re.sub(r"(?<![\w-])((?:[\w\-\[\]=&:]+:)*)text-\[([0-9.]+(?:px|rem))\]",
                  lambda m: m.group(1) + SIZE_MAP[m.group(2)] if m.group(2) in SIZE_MAP else m.group(0), text)
    text = re.sub(r"(?<![\w-])((?:[\w\-\[\]=&:]+:)*)z-\[(\d+)\]",
                  lambda m: m.group(1) + Z_MAP[m.group(2)] if m.group(2) in Z_MAP else m.group(0), text)

    def rad(m):
        v = m.group(3)
        if v.endswith("px"):
            return m.group(1) + nearest_radius(float(v[:-2])).replace("rounded", "rounded" + (m.group(2) or ""))
        if v.endswith("rem"):
            return m.group(1) + nearest_radius(float(v[:-3]) * 16).replace("rounded", "rounded" + (m.group(2) or ""))
        return m.group(0)
    text = re.sub(r"(?<![\w-])((?:[\w\-\[\]=&:]+:)*)rounded(-[tblr]{1,2})?-\[([0-9.]+(?:px|rem))\]", lambda m: rad(m) if True else m.group(0), text)
    return text


def replace_legacy(text):
    for pat, rep in LEGACY:
        text = re.sub(pat, rep, text)
    return text


def tidy(text):
    # collapse doubled spaces inside class strings produced by drops (only inside quotes/backticks)
    def fix(m):
        q, body = m.group(1), m.group(2)
        body2 = re.sub(r"[ ]{2,}", " ", body)
        if body2 != body and body.strip():
            body2 = body2.strip() if body[:1] != " " and body[-1:] != " " else body2
        return q + body2 + q
    return re.sub(r'(["`])([^"`\n]*?)\1', fix, text)


def process(path, dry):
    src = open(path, encoding="utf-8").read()
    out = replace_legacy(src)
    out = replace_palette(out)
    out = replace_misc(out)
    out = drop_dark_colors(out)
    # solid status fills: use semantic solid + foreground pair
    for scale, solid in (("success", "success"), ("warning", "warning"), ("danger", "destructive"), ("info", "info")):
        pat = r'(["`][^"`\n]*?)(?<![\w-])((?:[\w\-\[\]=&:]+:)*)bg-' + scale + r'-[5-7]00(?![\w/-])([^"`\n]*?)\btext-white\b'
        out = re.sub(pat, lambda m: m.group(1) + m.group(2) + "bg-" + solid + m.group(3) + "text-" + solid + "-foreground", out)
        pat2 = r'(["`][^"`\n]*?)\btext-white\b([^"`\n]*?)(?<![\w-])((?:[\w\-\[\]=&:]+:)*)bg-' + scale + r'-[5-7]00(?![\w/-])'
        out = re.sub(pat2, lambda m: m.group(1) + "text-" + solid + "-foreground" + m.group(2) + m.group(3) + "bg-" + solid, out)
    # never white text on gold (2.1:1)
    out = re.sub(r'(["`][^"`\n]*\bbg-primary\b[^"`\n]*?)\btext-white\b', r"\1text-primary-foreground", out)
    out = re.sub(r'(["`][^"`\n]*?)\btext-white\b([^"`\n]*\bbg-primary\b)', r"\1text-primary-foreground\2", out)
    if out != src:
        if not dry:
            open(path, "w", encoding="utf-8").write(out)
        return True
    return False


SKIP = ("lib/db/", "drizzle/", "lib/design/", "node_modules", ".next", "lib/email", "lib/inngest", "lib/hr/payslip",
        "lib/hr/offer-letter", "lib/termination-letter", "app/api/", "scripts/")


def main():
    args = sys.argv[1:]
    dry = "--dry" in args
    targets = [a for a in args if a != "--dry"]
    changed = 0
    for t in targets:
        paths = [t] if os.path.isfile(t) else [
            os.path.join(r, f) for r, _, fs in os.walk(t) for f in fs if f.endswith((".ts", ".tsx"))]
        for p in paths:
            if any(s in p for s in SKIP) or p.endswith(".test.ts") or p.endswith(".test.tsx"):
                continue
            if process(p, dry):
                changed += 1
                print(p)
    print(f"{'would change' if dry else 'changed'} {changed} files", file=sys.stderr)


if __name__ == "__main__":
    main()
