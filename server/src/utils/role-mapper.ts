/**
 * Role Mapper Utility
 * 
 * 将 AdminUserRole 映射到 OperatorType enum
 * 用于审计日志记录
 */

export type OperatorType = 'ADMIN' | 'USER' | 'SYSTEM' | 'API';

/**
 * 将 AdminUserRole 映射到 OperatorType
 */
export function mapRoleToOperatorType(role: string | null | undefined): OperatorType {
  if (!role) {
    return 'SYSTEM';
  }

  // 所有管理员角色映射到 ADMIN
  const adminRoles = [
    'SUPER_ADMIN',
    'HQ_ADMIN',
    'REGION_ADMIN',
    'STORE_ADMIN',
    'STORE_STAFF',
  ];

  if (adminRoles.includes(role.toUpperCase())) {
    return 'ADMIN';
  }

  // 普通用户角色
  if (role.toUpperCase() === 'USER') {
    return 'USER';
  }

  // 系统角色
  if (role.toUpperCase() === 'SYSTEM') {
    return 'SYSTEM';
  }

  // API 角色
  if (role.toUpperCase() === 'API') {
    return 'API';
  }

  // 默认映射到 USER
  return 'USER';
}
