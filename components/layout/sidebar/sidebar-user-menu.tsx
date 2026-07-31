"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Settings, LogOut, ChevronUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { resolveImageUrl } from "@/lib/utils";

interface SidebarUserMenuProps {
  isCollapsed: boolean;
  isAdmin: boolean;
}

export function SidebarUserMenu({ isCollapsed }: SidebarUserMenuProps) {
  const { data: session } = useSession();

  const name = session?.user?.name || "User";
  const email = session?.user?.email || "";
  const image = resolveImageUrl(session?.user?.image);
  const initials = name.charAt(0).toUpperCase();
  const role = session?.user?.role || "";

  const avatarEl = (
    <Avatar className="h-7 w-7 shrink-0 ring-1 ring-sidebar-border">
      <AvatarImage src={image} alt={name} />
      <AvatarFallback className="text-[11px] font-bold bg-gold/15 text-gold">
        {initials}
      </AvatarFallback>
    </Avatar>
  );

  const trigger = (
    <button
      type="button"
      className={cn(
        "group flex items-center gap-2.5 w-full rounded-lg outline-none transition-colors duration-150",
        "hover:bg-white/5 focus-visible:ring-1 focus-visible:ring-sidebar-ring",
        isCollapsed ? "justify-center p-2" : "px-2.5 py-2"
      )}
    >
      {avatarEl}

      {!isCollapsed && (
        <>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[0.8125rem] font-medium text-sidebar-foreground/85 truncate leading-none">
              {name}
            </p>
            <p className="text-[0.6875rem] text-sidebar-foreground/35 truncate mt-0.5 leading-none">
              {role}
            </p>
          </div>
          <ChevronUp className="h-3.5 w-3.5 text-sidebar-primary/75 group-hover:text-sidebar-primary transition-colors shrink-0" />
        </>
      )}
    </button>
  );

  const content = (
    <DropdownMenuContent
      align={isCollapsed ? "center" : "start"}
      side="top"
      sideOffset={6}
      className="w-56 z-[200]"
    >
      <div className="px-2 py-1.5">
        <p className="text-xs font-semibold text-foreground truncate">{name}</p>
        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{email}</p>
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <Link href="/settings" className="gap-2 cursor-pointer">
          <Settings className="h-3.5 w-3.5" />
          Settings
        </Link>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        className="gap-2 text-destructive focus:text-destructive cursor-pointer"
        onClick={() => signOut({ callbackUrl: "/signin" })}
      >
        <LogOut className="h-3.5 w-3.5" />
        Sign out
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      {content}
    </DropdownMenu>
  );

  if (isCollapsed) {
    return (
      <div className="border-t border-sidebar-border p-2 pb-2">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <div>{menu}</div>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10} className="text-xs">
            {name}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="border-t border-sidebar-border px-2 py-2">
      {menu}
    </div>
  );
}
