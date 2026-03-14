import { track } from "@vercel/analytics";

// Auth
export const trackLogin = (method: "email" | "oauth") =>
  track("user_login", { method });

export const trackRegister = (method: "email" | "oauth") =>
  track("user_register", { method });

export const trackLogout = () =>
  track("user_logout");

export const trackPasswordReset = (step: "requested" | "completed") =>
  track("password_reset", { step });

// Socket
// Matches your App.tsx connectSocket / disconnectSocket flow
export const trackSocketConnected = () =>
  track("socket_connected");

export const trackSocketError = (reason: string) =>
  track("socket_error", { reason });

// Chat
export const trackMessageSent = (type: "text" | "media") =>
  track("message_sent", { type });

export const trackRoomJoined = (roomType: "dm" | "group") =>
  track("room_joined", { roomType });

export const trackRoomCreated = (roomType: "dm" | "group") =>
  track("room_created", { roomType });

// Media
export const trackMediaUploaded = (fileType: string) =>
  track("media_uploaded", { fileType });

// Profile
export const trackProfileUpdated = () =>
  track("profile_updated");

export const trackAccountDeleted = () =>
  track("account_deleted");