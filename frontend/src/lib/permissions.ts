import type { User, InventoryDetail } from '@inventory/shared';

type AuthUser = Pick<User, 'id' | 'role'> | null | undefined;
type AccessData = Pick<
    InventoryDetail,
    'createdById' | 'isPublic' | 'accessList'
>;

export const canWrite = (user: AuthUser, inventory: AccessData): boolean => {
    if (!user) return false;
    if (inventory.isPublic) return true;
    if (user.role === 'ADMIN') return true;
    if (inventory.createdById === user.id) return true;
    if (inventory.accessList.some((a) => a.userId === user.id)) return true;
    return false;
};

export const canManage = (user: AuthUser, inventory: AccessData): boolean => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    if (inventory.createdById === user.id) return true;
    return false;
};
