export interface JobOfficeLocation {
  name: string;
  city: string;
  state: string;
  country: string;
}

export interface OrgSettings {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  timezone: string | null;
  currency: string | null;
  fiscalYearStart: number | null;
  mfaEnforced?: boolean;
  passwordExpiryDays?: number | null;
  allowedEmailDomains?: string[] | null;
  settings?: Record<string, unknown> | null;
  primaryColor?: string | null;
  loginBgUrl?: string | null;
  ipAllowlist?: string[];
  /** Preset office locations for job postings. */
  jobOfficeLocations?: JobOfficeLocation[];
  /** Minimum allowed monthly salary (₹) for employees (org `settings.minMonthlySalary`). 0/undefined = no minimum. */
  minMonthlySalary?: number | null;
  directoryPublic?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrgMember {
  userId: string;
  role: string;
  joinedAt: Date;
  name: string | null;
  email: string;
  image: string | null;
  totpEnabled?: boolean;
}

export interface Invitation {
  id: string;
  email: string;
  role: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface Branch {
  id: number;
  orgId: string;
  name: string;
  code: string;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  branchManagerId: string | null;
  branchHrId: string | null;
  status: "ACTIVE" | "INACTIVE";
  branchManager: {
    id: string;
    name: string | null;
    image: string | null;
    email?: string;
  } | null;
  branchHr: {
    id: string;
    name: string | null;
    image: string | null;
    email?: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Role {
  id: number;
  orgId: string;
  name: string;
  slug: string;
  isSystem: boolean;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  id: number;
  name: string;
  description: string | null;
  module: string | null;
}

export interface RolePermission {
  role: string;
  permissionId: number;
  orgId: string;
  permission: Permission | null;
}
