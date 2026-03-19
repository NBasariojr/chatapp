// apps/web/src/pages/chat-dashboard/types.ts

export interface SystemEvent {
  id: string;
  roomId: string;
  type: "system";
  content: string;       // theme name only — e.g. "Sky Garden"
  timestamp: Date;
  actorId: string;       // ID of the user who made the change
  actorName: string;     // display name of that user
}
