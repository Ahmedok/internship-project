import { User as SharedUser } from '@inventory/shared';

declare global {
    namespace Express {
        interface User extends SharedUser {}
    }
}
