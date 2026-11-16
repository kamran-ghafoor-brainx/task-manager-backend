export type Role = 'user' | 'admin';

export type UserTokenPurpose = 'email_verification' | 'password_reset';

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export const TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done'];

export type InvitationStatus =
  'pending' | 'accepted' | 'declined' | 'revoked' | 'expired';

export type NotificationType =
  | 'invitation.received'
  | 'invitation.accepted'
  | 'invitation.declined'
  | 'collaborator.removed'
  | 'task.status_changed'
  | 'task.updated'
  | 'task.deleted';
