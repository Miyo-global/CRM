/**
 * The user fields an expense list sends to the browser. `user: true` sent the
 * whole users row, password hash included (found with QA-AUTH-04).
 */
export const EXPENSE_USER = {
  columns: { id: true, firstName: true, lastName: true, name: true, email: true, image: true, role: true },
} as const;

export const EXPENSE_APPROVER = {
  columns: { id: true, firstName: true, lastName: true, email: true },
} as const;
