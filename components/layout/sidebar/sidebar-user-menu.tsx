"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { ChevronsUpDown, Keyboard, LogOut, SlidersHorizontal, SunMoon, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, resolveImageUrl } from "@/lib/utils";
import { getRoleLabel } from "@/lib/rbac/roles";
import { THEME_OPTIONS, useMountedTheme, type ThemeValue } from "../theme-toggle";
import { useShortcuts } from "../shortcuts-provider";

interface SidebarUserMenuProps {
  isCollapsed: boolean;
  isAdmin: boolean;
}

export function SidebarUserMenu({ isCollapsed }: SidebarUserMenuProps) {
  const { data: session } = useSession();
  const { theme, setTheme } = useMountedTheme();
  const { openShortcuts } = useShortcuts();

  const name = session?.user?.name || "User";
  const email = session?.user?.email || "";
  const image = resolveImageUrl(session?.user?.image);
  const initials = name.charAt(0).toUpperCase();
  // The role name, never the raw enum (R2-LC-13).
  const role = session?.user?.role ? getRoleLabel(session.user.role) : "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={isCollapsed ? `Account menu for ${name}` : undefined}
          title={isCollapsed ? name : undefined}
          className={cn(
            "group flex items-center gap-2.5 rounded-md text-left transition-colors duration-150 hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
            isCollapsed ? "size-10 justify-center" : "w-full px-2 py-1.5",
          )}
        >
          <Avatar className="size-7 shrink-0 ring-offset-2 ring-offset-sidebar group-data-[state=open]:ring-2 group-data-[state=open]:ring-sidebar-primary">
            <AvatarImage src={image} alt={name} />
            <AvatarFallback className="bg-sidebar-accent text-2xs font-semibold text-sidebar-accent-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-sidebar-accent-foreground">{name}</span>
                <span className="block truncate text-2xs text-sidebar-muted">{role}</span>
              </span>
              <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-sidebar-muted" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" side={isCollapsed ? "right" : "top"} sideOffset={8} className="w-60">
        <div className="px-2 py-1.5">
          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings#profile">
            <User />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings#preferences">
            <SlidersHorizontal />
            Preferences
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2">
            <SunMoon className="size-4 text-muted-foreground" />
            Theme
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-40">
            <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as ThemeValue)}>
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <DropdownMenuRadioItem key={value} value={value} className="gap-2">
                  <Icon className="size-4 text-muted-foreground" />
                  {label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onSelect={openShortcuts}>
          <Keyboard />
          Keyboard shortcuts
          <DropdownMenuShortcut>?</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => signOut({ callbackUrl: "/signin" })}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
