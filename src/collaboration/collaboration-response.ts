import type { InvitationStatus } from '../common/types';
import type { User } from '../users/user.entity';
import type { TaskCollaborator } from './task-collaborator.entity';
import type { TaskInvitation } from './task-invitation.entity';

export type UserSummary = {
  id: number;
  name: string;
  username: string;
};

export type SentInvitationResponse = {
  id: number;
  taskId: number;
  inviteeEmail: string | null;
  invitee: UserSummary | null;
  inviter: UserSummary;
  status: InvitationStatus;
  expiresAt: Date;
  createdAt: Date;
};

export type ReceivedInvitationResponse = {
  id: number;
  task: { id: number; title: string };
  inviter: UserSummary;
  expiresAt: Date;
  createdAt: Date;
};

export type CollaboratorResponse = UserSummary & {
  addedAt: Date;
};

export function toUserSummary(user: User): UserSummary {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
  };
}

export function toSentInvitationResponse(
  invitation: TaskInvitation,
): SentInvitationResponse {
  const showProfile =
    invitation.invitedByUsername && invitation.inviteeUser !== null;

  const invitee = showProfile ? toUserSummary(invitation.inviteeUser!) : null;
  const inviteeEmail = invitation.invitedByUsername
    ? null
    : invitation.inviteeEmail;

  return {
    id: invitation.id,
    taskId: invitation.taskId,
    inviteeEmail,
    invitee,
    inviter: toUserSummary(invitation.inviter),
    status: invitation.status,
    expiresAt: invitation.expiresAt,
    createdAt: invitation.createdAt,
  };
}

export function toReceivedInvitationResponse(
  invitation: TaskInvitation,
): ReceivedInvitationResponse {
  return {
    id: invitation.id,
    task: { id: invitation.task.id, title: invitation.task.title },
    inviter: toUserSummary(invitation.inviter),
    expiresAt: invitation.expiresAt,
    createdAt: invitation.createdAt,
  };
}

export function toCollaboratorResponse(
  collaborator: TaskCollaborator,
): CollaboratorResponse {
  return {
    ...toUserSummary(collaborator.user),
    addedAt: collaborator.createdAt,
  };
}
