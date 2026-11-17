import type { UserRole } from '../utils/tokens';

// Tells TypeScript that every Express request may carry a logged-in user.
// The authenticate middleware fills this in after verifying the access token.
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        fullName: string;
        course: string;
        yearLevel: number;
        role: UserRole;
      };
    }
  }
}

export {};
