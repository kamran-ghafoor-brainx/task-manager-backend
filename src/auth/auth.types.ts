import type { Role } from '../common/types';

export type JwtPayload = {
  sub: string;
  role: Role;
  ver: number;
};

export type AuthUser = {
  id: number;
  role: Role;
  emailVerified: boolean;
};

export const JWT_ISSUER = 'task-manager-api';
export const JWT_AUDIENCE = 'task-manager-app';

export const AuthEvents = {
  SessionsRevoked: 'auth.sessions_revoked',
} as const;

export type SessionsRevokedEvent = {
  userId: number;
};
