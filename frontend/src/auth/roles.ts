export type UserRole =
  | 'ADMIN'
  | 'MARKETING'
  | 'SALES_REP'
  | 'SALES_MANAGER'
  | 'TECH_LEAD'
  | 'FINANCIAL_OFFICER'
  | 'PROJECT_MANAGER'
  | 'SOFTWARE_ENGINEER'
  | 'DIRECTOR'
  | 'EXECUTIVE'


export type AssignableAdminRole =
  | 'ADMIN'
  | 'SALES_REP'
  | 'SALES_MANAGER'
  | 'TECH_LEAD'
  | 'FINANCIAL_OFFICER'
  | 'SOFTWARE_ENGINEER'
  | 'EXECUTIVE'


export const USER_ROLES = {
  ADMIN: 'ADMIN',
  MARKETING: 'MARKETING',
  SALES_REP: 'SALES_REP',
  SALES_MANAGER: 'SALES_MANAGER',
  TECH_LEAD: 'TECH_LEAD',
  FINANCIAL_OFFICER: 'FINANCIAL_OFFICER',
  PROJECT_MANAGER: 'PROJECT_MANAGER',
  SOFTWARE_ENGINEER: 'SOFTWARE_ENGINEER',
  DIRECTOR: 'DIRECTOR',
  EXECUTIVE: 'EXECUTIVE',
} as const


export const USER_ROLE_LABELS:
Record<UserRole, string> = {
  ADMIN: 'Administrator',
  MARKETING: 'Marketing Employee',
  SALES_REP: 'Sales Representative',
  SALES_MANAGER: 'Sales Manager',
  TECH_LEAD: 'Tech Lead',
  FINANCIAL_OFFICER: 'Financial Officer',
  PROJECT_MANAGER: 'Project Manager',
  SOFTWARE_ENGINEER: 'Software Engineer',
  DIRECTOR: 'Director',
  EXECUTIVE: 'Executive',
}

export const EXECUTIVE_PRIMARY_NAVIGATION = [
  'Dashboard',
  'Pipeline',
  'Reports & Analytics',
  'Approvals',
] as const


export const ADMIN_ASSIGNABLE_ROLE_OPTIONS:
Array<{
  value: AssignableAdminRole
  label: string
}> = [
  {
    value: 'ADMIN',
    label: 'Administrator',
  },
  {
    value: 'SALES_REP',
    label: 'Sales Representative',
  },
  {
    value: 'SALES_MANAGER',
    label: 'Sales Manager',
  },
  {
    value: 'TECH_LEAD',
    label: 'Tech Lead',
  },
  {
    value: 'FINANCIAL_OFFICER',
    label: 'Financial Officer',
  },
  {
    value: 'SOFTWARE_ENGINEER',
    label: 'Software Engineer',
  },
  {
    value: 'EXECUTIVE',
    label: 'Executive',
  },
]


export function isAdminAssignableRole(
  role: string,
): role is AssignableAdminRole {
  return ADMIN_ASSIGNABLE_ROLE_OPTIONS.some(
    (option) => option.value === role,
  )
}


export function hasRequiredRole(
  userRole: string,
  allowedRoles: UserRole[],
): boolean {
  return allowedRoles.includes(userRole as UserRole)
}
