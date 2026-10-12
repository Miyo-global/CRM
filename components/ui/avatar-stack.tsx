
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { cn, resolveImageUrl } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

interface User {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  image?: string | null;
}

interface AvatarStackProps {
  users: User[];
  limit?: number;
  className?: string;
  onSelect?: (userId: string) => void;
  selectedIds?: string[];
}

export function AvatarStack({ users, limit = 5, className, onSelect, selectedIds = [] }: AvatarStackProps) {
  const visibleUsers = users.slice(0, limit);
  const remainingCount = Math.max(0, users.length - limit);

  return (
    <div className={cn("flex -space-x-2 items-center", className)}>
      <TooltipProvider>
        {visibleUsers.map((user) => {
           const isSelected = selectedIds.includes(user.id);
           return (
            <Tooltip key={user.id}>
              <TooltipTrigger asChild>
                <div
                    className={cn(
                        "relative cursor-pointer rounded-full transition-transform duration-150 hover:z-10 hover:-translate-y-0.5 motion-reduce:transition-none",
                        isSelected && "z-20 -translate-y-0.5"
                    )}
                    onClick={() => onSelect?.(user.id)}
                >
                  <Avatar className={cn(
                      "size-8 ring-2 ring-card",
                      isSelected && "ring-primary"
                  )}>
                    <AvatarImage src={resolveImageUrl(user.image)} />
                    <AvatarFallback>
                      {user.firstName?.[0]}
                      {user.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{user.firstName} {user.lastName}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>

      {remainingCount > 0 && (
        <div className="z-0 flex size-8 items-center justify-center rounded-full bg-neutral-soft text-2xs font-semibold text-neutral-strong ring-2 ring-card tabular-nums">
          +{remainingCount}
        </div>
      )}
    </div>
  );
}
