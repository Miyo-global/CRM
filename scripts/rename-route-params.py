"""
Renames all [id] dynamic route directories in app/api/v1/ to entity-specific names,
and updates the params type definitions + destructuring inside each route.ts file.
"""

import os
import re
import shutil
from pathlib import Path

BASE = Path("D:/projects/miyo-global-crm/app/api/v1")

# Maps: old path prefix (relative to BASE) -> new entity param name
RENAMES: list[tuple[str, str]] = [
    ("projects/[id]", "projectId"),
    ("hr/employees/[id]", "employeeId"),
    ("hr/expenses/[id]", "expenseId"),
    ("hr/leaves/[id]", "leaveId"),
    ("hr/assets/[id]", "assetId"),
    ("hr/documents/[id]", "documentId"),
    ("hr/helpdesk/[id]", "ticketId"),
    ("leads/[id]", "leadId"),
    ("deals/[id]", "dealId"),
    ("contacts/[id]", "contactId"),
    ("clients/[id]", "clientId"),
    ("targets/[id]", "targetId"),
    ("roles/[id]", "roleId"),
    ("branches/[id]", "branchId"),
    ("invoices/[id]", "invoiceId"),
    ("support/[id]", "supportTicketId"),
    ("organization/members/[id]", "memberId"),
    ("notifications/[id]", "notificationId"),
    ("chat/channels/[id]", "channelId"),
    ("dm/leads/[id]", "dmLeadId"),
    ("dm/campaigns/[id]", "campaignId"),
]


def update_content(content: str, entity_param: str) -> str:
    """Update param type definitions and destructuring in a route file."""
    # Replace type definitions: { id: string } -> { entityParam: string }
    content = content.replace("{ id: string }", f"{{ {entity_param}: string }}")

    # Replace destructuring patterns:
    # const { id } = await params;  ->  const { entityParam: id } = await params;
    # const { id } = await ctx.params;  -> const { entityParam: id } = await ctx.params;
    content = re.sub(
        r'const \{ id \} = await (params|ctx\.params)',
        f'const {{ {entity_param}: id }} = await \\1',
        content
    )
    # Also handle: const { id: someAlias }
    # Already handled since we only match `{ id }` exactly

    return content


def rename_tree(old_dir: Path, new_dir: Path, entity_param: str) -> None:
    """Recursively copy old_dir to new_dir, updating file content."""
    new_dir.mkdir(parents=True, exist_ok=True)
    for item in old_dir.iterdir():
        dest = new_dir / item.name
        if item.is_dir():
            rename_tree(item, dest, entity_param)
        else:
            content = item.read_text(encoding="utf-8")
            updated = update_content(content, entity_param)
            dest.write_text(updated, encoding="utf-8")
            if content != updated:
                print(f"  Updated params in: {dest.relative_to(BASE)}")
            else:
                print(f"  Copied (no changes): {dest.relative_to(BASE)}")


def main() -> None:
    changed = 0
    skipped = 0

    for rel_path, entity_param in RENAMES:
        old_dir = BASE / rel_path
        new_rel = rel_path.replace("[id]", f"[{entity_param}]")
        new_dir = BASE / new_rel

        if not old_dir.exists():
            print(f"SKIP (not found): {rel_path}")
            skipped += 1
            continue

        if new_dir.exists():
            print(f"SKIP (already renamed): {new_rel}")
            skipped += 1
            continue

        print(f"\nRenaming: {rel_path} -> {new_rel}")
        rename_tree(old_dir, new_dir, entity_param)
        shutil.rmtree(old_dir)
        print(f"  Deleted old: {rel_path}")
        changed += 1

    print(f"\nDone. {changed} renamed, {skipped} skipped.")


if __name__ == "__main__":
    main()
