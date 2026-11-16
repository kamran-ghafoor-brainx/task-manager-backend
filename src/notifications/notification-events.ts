export const NotificationEvents = {
  InvitationCreated: 'invitation.created',
  InvitationAccepted: 'invitation.accepted',
  InvitationDeclined: 'invitation.declined',
  CollaboratorRemoved: 'collaborator.removed',
  TaskStatusChanged: 'task.status_changed',
  TaskUpdated: 'task.updated',
  TaskDeleted: 'task.deleted',
} as const;

export type InvitationCreatedEvent = {
  taskId: number;
  taskTitle: string;
  inviterName: string;
  inviteeUserId: number | null;
};

export type InvitationAcceptedEvent = {
  taskId: number;
  taskTitle: string;
  acceptedByName: string;
  taskOwnerId: number;
};

export type InvitationDeclinedEvent = {
  taskId: number;
  taskTitle: string;
  declinedByName: string;
  taskOwnerId: number;
};

export type CollaboratorRemovedEvent = {
  taskId: number;
  taskTitle: string;
  removedUserId: number;
  removedByName: string;
  removedByOwner: boolean;
};

export type TaskStatusChangedEvent = {
  taskId: number;
  taskTitle: string;
  newStatus: string;
  changedByUserId: number;
  changedByName: string;
  notifyUserIds: number[];
};

export type TaskUpdatedEvent = {
  taskId: number;
  taskTitle: string;
  updatedByName: string;
  collaboratorIds: number[];
};

export type TaskDeletedEvent = {
  taskId: number;
  taskTitle: string;
  deletedByName: string;
  collaboratorIds: number[];
};
