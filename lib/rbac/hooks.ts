import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { useUserPermissions } from "../api/hooks/rbac";

export function usePermissions() {
  const { data: session } = useSession();
  const { data: userPermissions, isLoading } = useUserPermissions({
    enabled: !!session?.user?.id,
  });

  const hasPermission = useMemo(
    () => (permission: string) => {
      if (!userPermissions) return false;
      return userPermissions.includes(permission);
    },
    [userPermissions],
  );

  const hasAnyPermission = useMemo(
    () => (permissions: string[]) => {
      if (!userPermissions) return false;
      return permissions.some((perm) => userPermissions.includes(perm));
    },
    [userPermissions],
  );

  const hasAllPermissions = useMemo(
    () => (permissions: string[]) => {
      if (!userPermissions) return false;
      return permissions.every((perm) => userPermissions.includes(perm));
    },
    [userPermissions],
  );

  return {
    permissions: userPermissions ?? [],
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isLoading,
  };
}
