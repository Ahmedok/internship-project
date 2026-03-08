import type { AuthUser } from '../utils/permissions';

export interface SessionUser extends AuthUser {
    name: string;
    email: string | null;
    avatarUrl: string | null;
    blocked: boolean;
    provider: string;
    providerId: string;
    createdAt: Date;
    updatedAt: Date;
}

declare global {
    namespace Express {
        interface User extends SessionUser {}
    }
}
