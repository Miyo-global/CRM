"""
Fixes nested route files where the parent entity param is still named 'id'.
e.g. { id: string; cycleId: string } -> { projectId: string; cycleId: string }
"""

import re
from pathlib import Path

# Maps: file glob pattern -> (old_parent_param, new_parent_param)
FIXES: list[tuple[str, str, str]] = [
    # Projects nested: id -> projectId
    ("app/api/v1/projects/[projectId]/cycles/[cycleId]/route.ts", "id", "projectId"),
    ("app/api/v1/projects/[projectId]/intake/[requestId]/route.ts", "id", "projectId"),
    ("app/api/v1/projects/[projectId]/modules/[moduleId]/route.ts", "id", "projectId"),
    ("app/api/v1/projects/[projectId]/pages/[pageId]/route.ts", "id", "projectId"),
    ("app/api/v1/projects/[projectId]/sprints/[sprintId]/route.ts", "id", "projectId"),
    ("app/api/v1/projects/[projectId]/sprints/[sprintId]/burndown/route.ts", "id", "projectId"),
    ("app/api/v1/projects/[projectId]/tickets/[ticketId]/route.ts", "id", "projectId"),
    ("app/api/v1/projects/[projectId]/tickets/[ticketId]/time-entries/route.ts", "id", "projectId"),
    ("app/api/v1/projects/[projectId]/views/[viewId]/route.ts", "id", "projectId"),
    # Chat nested: id -> channelId
    ("app/api/v1/chat/channels/[channelId]/messages/[messageId]/route.ts", "id", "channelId"),
]

BASE = Path("D:/projects/miyo-global-crm")


def fix_file(rel_path: str, old: str, new: str) -> None:
    path = BASE / rel_path
    if not path.exists():
        print(f"SKIP (not found): {rel_path}")
        return

    content = path.read_text(encoding="utf-8")
    original = content

    # 1. Fix type definitions: { id: string; X: string } -> { projectId: string; X: string }
    # Also handles: { id: string } on its own (covered by rename script already, but just in case)
    pattern = r'\{ ' + old + r': string(;|\})'
    content = re.sub(
        pattern,
        lambda m: '{ ' + new + ': string' + m.group(1),
        content
    )

    # 2. Fix destructuring that uses the old param WITH other params:
    #    const { id, subId } = await params;  ->  const { projectId: id, subId } = await params;
    # Only if handler code uses 'id' internally (i.e., `const projectId = Number(id)` etc.)
    # Check if `id` is used after destructuring
    has_id_usage = bool(re.search(r'Number\(id\)|= id\b|id\b[^e]', content))
    if has_id_usage:
        pattern2 = r'const \{ ' + old + r','
        content = re.sub(
            pattern2,
            'const { ' + new + ': id,',
            content
        )
    else:
        # Handler doesn't use old param at all — just remove it from destructuring if present
        # e.g. const { id, sprintId } -> const { sprintId } (but id wasn't used anyway)
        # Actually simpler: leave destructuring as-is since TypeScript allows unused destructured params
        # The type definition fix above is sufficient
        pass

    if content != original:
        path.write_text(content, encoding="utf-8")
        print(f"Fixed: {rel_path}")
    else:
        print(f"No change: {rel_path}")


def main() -> None:
    for rel_path, old, new in FIXES:
        fix_file(rel_path, old, new)


if __name__ == "__main__":
    main()
