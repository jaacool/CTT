import { User, Role, PermissionStatus } from '../types';

export const hasPermission = (user: User | null, roles: Role[], permissionName: string): boolean => {
  if (!user || !user.role) return false;
  
  const userRole = roles.find(r => r.id === user.role);
  if (!userRole) return false;
  
  const permission = userRole.permissions.find(p => p.name === permissionName);
  if (!permission) return false;
  
  return permission.status === PermissionStatus.Granted || permission.status === PermissionStatus.Partial;
};

export const isAdmin = (user: User | null, roles: Role[]): boolean => {
  if (!user || !user.role) return false;
  const userRole = roles.find(r => r.id === user.role);
  return userRole?.name === 'Admin';
};
