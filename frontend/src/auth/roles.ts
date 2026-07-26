export type UserRole =
  | 'ADMIN'
  | 'MARKETING'
  | 'PROJECT_MANAGER'
  | 'SALES_REP'
  | 'DIRECTOR'

export const USER_ROLES = {
  ADMIN: 'ADMIN',
  MARKETING: 'MARKETING',
  PROJECT_MANAGER: 'PROJECT_MANAGER',
  SALES_REP: 'SALES_REP',
  DIRECTOR: 'DIRECTOR',
} as const

export function hasRequiredRole(
  userRole: string,
  allowedRoles: UserRole[],
): boolean {
  return allowedRoles.includes(userRole as UserRole)
}