import type { User } from '@inventory/shared';

export type AuthUser = Pick<User, 'id' | 'role'>;

export interface InventoryAccessData {
    createdById: string;
    isPublic: boolean;
    accessList: { userId: string }[];
}

export const accessPolicy = {
    canWrite: (
        user: AuthUser | undefined | null,
        inventory: InventoryAccessData,
    ) => {
        if (!user) return false;
        if (inventory.isPublic) return true;
        if (user.role === 'ADMIN') return true;
        if (inventory.createdById === user.id) return true;
        if (inventory.accessList?.some((a) => a.userId === user.id))
            return true;

        return false;
    },
    canManage: (
        user: AuthUser | undefined | null,
        inventory: InventoryAccessData,
    ) => {
        if (!user) return false;
        if (user.role === 'ADMIN') return true;
        if (inventory.createdById === user.id) return true;

        return false;
    },
};
