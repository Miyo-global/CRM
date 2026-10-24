/**
 * The user fields a joined row (`with: { user: ... }`) may send to the
 * browser. `user: true` sent the whole users row: password hash, salary,
 * phone, bank details and the Google refresh token (R3-NET-01).
 */
export const USER_CARD = {
  columns: {
    id: true,
    name: true,
    firstName: true,
    lastName: true,
    email: true,
    image: true,
    role: true,
    designation: true,
    departmentId: true,
    employeeId: true,
    isActive: true,
  },
} as const;
