import { Request } from 'express';
import { User } from 'types';

export interface AuthenticatedRequest extends Request {
    user: User;
}
