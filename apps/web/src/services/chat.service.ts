// web/src/services/chat.service.ts
import axios from 'axios';
import type { Room, Message, RoomSettings, UserRole, Media } from '@chatapp/shared';
import { store } from '../redux/store';
import { logout } from '../redux/slices/authSlice';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/',
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('chatapp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      store.dispatch(logout());
    }
    return Promise.reject(error);
  }
);

export const chatService = {
  getRooms: async (): Promise<Room[]> => {
    const res = await client.get('/api/rooms');
    return res.data.data;
  },

  createRoom: async (params: { participantIds: string[]; name?: string; isGroup?: boolean }): Promise<Room> => {
    const res = await client.post('/api/rooms', params);
    return res.data.data;
  },

  updateRoom: async (roomId: string, data: { name?: string; description?: string }): Promise<Room> => {
    const res = await client.patch(`/api/rooms/${roomId}`, data);
    return res.data.data;
  },

  archiveRoom: async (roomId: string): Promise<Room> => {
    const res = await client.patch(`/api/rooms/${roomId}/archive`);
    return res.data.data;
  },

  deleteRoom: async (roomId: string): Promise<void> => {
    await client.delete(`/api/rooms/${roomId}`);
  },

  exportChat: async (roomId: string): Promise<{ url: string }> => {
    const res = await client.get(`/api/rooms/${roomId}/export`);
    return res.data.data;
  },

  updateRoomSettings: async (roomId: string, settings: Partial<RoomSettings>): Promise<Room> => {
    const res = await client.patch(`/api/rooms/${roomId}/settings`, settings);
    return res.data.data;
  },

  getMessages: async (roomId: string, page = 1): Promise<{ messages: Message[] }> => {
    const res = await client.get(`/api/messages/${roomId}`, { params: { page } });
    return res.data.data;
  },

  sendMessage: async (
    roomId: string,
    content: string,
    type = 'text',
    replyTo?: string,
  ): Promise<Message> => {
    const res = await client.post(`/api/messages/${roomId}`, {
      content,
      type,
      ...(replyTo && { replyTo }),
    });
    return res.data.data;
  },

  editMessage: async (messageId: string, content: string): Promise<Message> => {
    const res = await client.patch(`/api/messages/${messageId}`, { content });
    return res.data.data;
  },

  deleteMessage: async (messageId: string): Promise<void> => {
    await client.delete(`/api/messages/${messageId}`);
  },

  uploadMedia: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await client.post('/api/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  searchUsers: async (query: string) => {
    const res = await client.get('/api/users/search', { params: { q: query } });
    return res.data.data;
  },

  sendFriendRequest: async (userId: string) => {
    const res = await client.post('/api/users/friends/request', { userId });
    return res.data;
  },

  acceptFriendRequest: async (userId: string) => {
    const res = await client.post('/api/users/friends/accept', { userId });
    return res.data;
  },

  rejectFriendRequest: async (userId: string) => {
    const res = await client.post('/api/users/friends/reject', { userId });
    return res.data;
  },

  removeFriend: async (userId: string) => {
    const res = await client.delete(`/api/users/friends/${userId}`);
    return res.data;
  },

  getFriends: async () => {
    const res = await client.get('/api/users/friends');
    return res.data.data;
  },

  getFriendRequests: async () => {
    const res = await client.get('/api/users/friends/requests');
    return res.data.data;
  },

  getRoomMedia: async (roomId: string): Promise<Media[]> => {
    const res = await client.get(`/api/media/room/${roomId}`);
    return res.data.data;
  },

  deleteMedia: async (mediaId: string): Promise<void> => {
    await client.delete(`/api/media/${mediaId}`);
  },

  removeParticipant: async (roomId: string, userId: string): Promise<Room> => {
    const res = await client.patch(`/api/rooms/${roomId}/participants/remove`, { userId });
    return res.data.data;
  },

  changeParticipantRole: async (roomId: string, userId: string, role: UserRole): Promise<Room> => {
    const res = await client.patch(`/api/rooms/${roomId}/participants/role`, { userId, role });
    return res.data.data;
  },
};