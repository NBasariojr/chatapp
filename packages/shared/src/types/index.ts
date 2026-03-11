// packages/shared/types/index.ts

export type UserRole = 'user' | 'admin' | 'moderator';
export type MessageType = 'text' | 'image' | 'video' | 'file';
export type MessageStatus = 'sent' | 'delivered' | 'read';


export interface User {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  role: UserRole;
  isOnline: boolean;
  lastSeen: string;
  twoFactorEnabled?: boolean;
  notificationSettings?: {
    browserPush?: boolean;
    emailNotifications?: boolean;
    mentionAlerts?: boolean;
    messagePreview?: boolean;
    soundEnabled?: boolean;
    soundType?: string;
    quietHours?: boolean;
    quietStart?: string;
    quietEnd?: string;
    groupNotifications?: string;
    directMessages?: string;
    vibration?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser extends User {
  token: string;
}

export interface Message {
  _id: string;
  content: string;
  type: MessageType;
  status: MessageStatus;
  sender: User;
  roomId: string;
  mediaUrl?: string;
  replyTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoomSettings {
  allowMemberInvites: boolean;
  allowMediaSharing: boolean;
  allowMessageEditing: boolean;
  allowMessageDeletion: boolean;
  enableReadReceipts: boolean;
  enableTypingIndicators: boolean;
  muteNotifications: boolean;
  archiveOldMessages: boolean;
}

export interface Room {
  _id: string;
  name?: string;
  description?: string;
  isGroup: boolean;
  participants: User[];
  admins?: User[];
  moderators?: User[];   
  lastMessage?: Message;
  avatar?: string;
  createdBy: string;
  isPrivate?: boolean;
  settings?: RoomSettings;
  messageCount?: number;
  mediaCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Media {
  _id: string;
  url: string;
  type: 'image' | 'video' | 'file';
  size: number;
  filename: string;
  uploadedBy: string;
  roomId: string;
  createdAt: string;
}

export interface Notification {
  _id: string;
  type: 'message' | 'mention' | 'system';
  title: string;
  body: string;
  userId: string;
  roomId?: string;
  read: boolean;
  createdAt: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Socket event types
export interface SocketEvents {
  'message:send': (payload: { roomId: string; content: string; type: MessageType }) => void;
  'message:received': (message: Message) => void;
  'message:read': (payload: { messageId: string; roomId: string }) => void;
  'user:typing': (payload: { roomId: string; userId: string }) => void;
  'user:stop-typing': (payload: { roomId: string; userId: string }) => void;
  'user:online': (userId: string) => void;
  'user:offline': (userId: string) => void;
  'room:join': (roomId: string) => void;
  'room:leave': (roomId: string) => void;
}
