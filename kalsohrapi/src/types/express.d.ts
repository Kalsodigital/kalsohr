import { JWTPayload } from '../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      organizationId?: number;
      organization?: {
        id: number;
        name: string;
        slug: string;
        subscriptionPlanId: number;
        isActive: boolean;
        status: string;
      };
    }
  }
}

export {};
