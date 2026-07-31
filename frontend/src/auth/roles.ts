export type UserRole =
  | 'ADMIN'
  | 'MARKETING'
  | 'SALES_REP'
  | 'SALES_MANAGER'
  | 'PROJECT_MANAGER'
  | 'SOFTWARE_ENGINEER'
  | 'DIRECTOR'

export const USER_ROLES = {
  ADMIN: 'ADMIN',
  MARKETING: 'MARKETING',
  SALES_REP: 'SALES_REP',
  SALES_MANAGER: 'SALES_MANAGER',
  PROJECT_MANAGER: 'PROJECT_MANAGER',
  SOFTWARE_ENGINEER: 'SOFTWARE_ENGINEER',
  DIRECTOR: 'DIRECTOR',
} as const

export function hasRequiredRole(
  userRole: string,
  allowedRoles: UserRole[],
): boolean {
  return allowedRoles.includes(userRole as UserRole)
}