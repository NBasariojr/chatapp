import crypto from "node:crypto";
import { User, IUser } from "../models/user.model";
import { OAuthVerificationError } from "../utils/errors";
import { getRedis } from "../config/redis";

// Google API Response Types
interface GoogleTokenExchangeResponse {
  access_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface GoogleIdTokenClaims {
  iss: string;
  aud: string | string[];
  sub: string;
  email: string;
  email_verified: string;
  name?: string;
  picture?: string;
  given_name?: string;
  exp: string;
  iat: string;
}

export interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

// Constants
const GOOGLE_AUTH_CODE_PATTERN = /^[A-Za-z0-9\-._~+/=]+$/;

const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "moderator",
  "mod",
  "root",
  "system",
  "chatapp",
  "support",
  "help",
  "bot",
  "user",
  "null",
  "undefined",
  "me",
  "api",
]);

// Helper function to validate environment and code
const validateAuthInputs = (code: string): { clientId: string; clientSecret: string } => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured",
    );
  }

  if (!code || !GOOGLE_AUTH_CODE_PATTERN.test(code) || code.length > 4096) {
    throw new OAuthVerificationError("Invalid authorization code format");
  }

  return { clientId, clientSecret };
};

// Helper function to check code replay in Redis
const checkCodeReplay = async (code: string): Promise<void> => {
  const codeHash = crypto
    .createHash("sha256")
    .update(code)
    .digest("hex")
    .slice(0, 32);
  const codeKey = `oauth_code_used:${codeHash}`;

  try {
    const redis = getRedis();
    // Atomic SET with NX and EX to prevent race conditions
    const result = await redis.set(codeKey, "1", "EX", 300, "NX");
    if (result !== "OK") {
      throw new OAuthVerificationError(
        "Authorization code has already been used",
      );
    }
  } catch (err) {
    if (err instanceof OAuthVerificationError) throw err;
    console.error(
      "[googleAuth] Redis code-replay check unavailable:",
      (err as Error).message,
    );
  }
};

// Helper function to exchange authorization code for tokens
const exchangeCodeForTokens = async (
  code: string,
  clientId: string,
  clientSecret: string,
): Promise<GoogleTokenExchangeResponse> => {
  let tokenExchangeRes: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    tokenExchangeRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: "postmessage",
        grant_type: "authorization_code",
      }).toString(),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
  } catch (err) {
    if ((err as Error).name === "TimeoutError") {
      throw new OAuthVerificationError(
        "Google sign-in timed out. Please try again.",
      );
    }
    throw err;
  }

  if (!tokenExchangeRes.ok) {
    const errorBody = (await tokenExchangeRes.json().catch(() => ({}))) as {
      error?: string;
      error_description?: string;
    };
    const userMessage =
      errorBody.error === "invalid_grant"
        ? "Google sign-in session expired. Please try again."
        : (errorBody.error_description ?? "Google authentication failed");
    throw new OAuthVerificationError(userMessage);
  }

  const tokens = (await tokenExchangeRes.json()) as GoogleTokenExchangeResponse;

  if (!tokens.id_token) {
    throw new OAuthVerificationError("Google did not return an identity token");
  }

  return tokens;
};

// Helper function to verify ID token with Google
const verifyIdToken = async (
  idToken: string,
): Promise<GoogleIdTokenClaims> => {
  let tokenInfoRes: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    tokenInfoRes = await fetch("https://oauth2.googleapis.com/tokeninfo", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ id_token: idToken }).toString(),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
  } catch (err) {
    if ((err as Error).name === "TimeoutError") {
      throw new OAuthVerificationError(
        "Google identity verification timed out. Please try again.",
      );
    }
    throw err;
  }

  if (!tokenInfoRes.ok) {
    throw new OAuthVerificationError(
      "Google identity token verification failed",
    );
  }

  return (await tokenInfoRes.json()) as GoogleIdTokenClaims;
};

// Helper function to validate token claims
const validateTokenClaims = (
  claims: GoogleIdTokenClaims,
  clientId: string,
): void => {
  const audClaim = claims.aud;
  const audMatch = Array.isArray(audClaim)
    ? audClaim.includes(clientId)
    : audClaim === clientId;

  if (!audMatch) {
    throw new OAuthVerificationError(
      "Google token was not issued for this application",
    );
  }

  if (String(claims.email_verified) !== "true") {
    throw new OAuthVerificationError(
      "Google account email address is not verified",
    );
  }

  if (Number(claims.exp) < Math.floor(Date.now() / 1000)) {
    throw new OAuthVerificationError("Google identity token has expired");
  }
};

// Main function - now much simpler
export const exchangeAndVerifyGoogleCode = async (
  code: string,
): Promise<GoogleUserInfo> => {
  const { clientId, clientSecret } = validateAuthInputs(code);
  await checkCodeReplay(code);
  
  const tokens = await exchangeCodeForTokens(code, clientId, clientSecret);
  const claims = await verifyIdToken(tokens.id_token);
  validateTokenClaims(claims, clientId);

  return {
    sub: claims.sub,
    email: claims.email,
    name: claims.name ?? claims.given_name ?? claims.email.split("@")[0],
    picture: claims.picture,
  };
};

// Username Generation
const generateUniqueUsername = async (displayName: string): Promise<string> => {
  const base =
    displayName
      .replaceAll(/[^a-zA-Z0-9]/g, "")
      .toLowerCase()
      .slice(0, 20) || "user";

  const safeBase = RESERVED_USERNAMES.has(base) ? `${base}_u` : base;

  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate =
      attempt === 0
        ? safeBase
        : `${safeBase}_${Math.random().toString(36).slice(2, 6)}`;

    const exists = await User.findOne({ username: candidate }).lean();
    if (!exists) return candidate;
  }

  // Guaranteed-unique timestamp fallback
  return `${safeBase}_${Date.now().toString(36)}`;
};

// Helper function to find existing user by Google ID
const findUserByGoogleId = async (googleId: string): Promise<IUser | null> => {
  return await User.findOneAndUpdate(
    { googleId },
    { $set: { isOnline: true } },
    { new: true },
  );
};

// Helper function to link Google to existing email account
const linkGoogleToEmailAccount = async (
  email: string,
  googleId: string,
  name?: string,
  picture?: string,
): Promise<IUser> => {
  const updatedUser = await User.findOneAndUpdate(
    { email, googleId: null },
    {
      $set: {
        googleId,
        authProvider: "both",
        isEmailVerified: true,
        isOnline: true,
      },
    },
    { new: true },
  );

  if (!updatedUser) {
    throw new Error("Failed to link Google account to email");
  }

  // Update profile if missing
  const profileUpdates: Record<string, string> = {};
  if (!updatedUser.displayName && name) profileUpdates.displayName = name;
  if (!updatedUser.avatar && picture) profileUpdates.avatar = picture;

  if (Object.keys(profileUpdates).length > 0) {
    return (await User.findByIdAndUpdate(
      updatedUser._id,
      { $set: profileUpdates },
      { new: true },
    )) as IUser;
  }

  return updatedUser;
};

// Helper function to create new Google user
const createGoogleUser = async (
  userInfo: GoogleUserInfo,
): Promise<IUser> => {
  const { sub, email, name, picture } = userInfo;
  const username = await generateUniqueUsername(name);

  return await User.create({
    username,
    displayName: name,
    email,
    googleId: sub,
    authProvider: "google",
    isEmailVerified: true,
    avatar: picture ?? null,
    isOnline: true,
    lastSeen: new Date(),
  });
};

// Helper function to handle MongoDB duplicate key errors
const handleDuplicateKeyError = async (
  error: any,
  googleId: string,
): Promise<IUser> => {
  const mongoError = error as {
    code?: number;
    keyPattern?: Record<string, number>;
  };

  if (mongoError.code !== 11000) {
    throw error;
  }

  const keyPattern = mongoError.keyPattern ?? {};
  const isGoogleIdConflict = "googleId" in keyPattern;
  const isEmailConflict = "email" in keyPattern;

  if (isGoogleIdConflict) {
    const existing = await findUserByGoogleId(googleId);
    if (existing) return existing;
  }

  if (isEmailConflict) {
    throw new OAuthVerificationError(
      "This email address is already associated with a different account. " +
        "Sign in using your original method.",
    );
  }

  throw error;
};

// User Upsert (Account Linking) - Refactored
export const upsertGoogleUser = async (
  userInfo: GoogleUserInfo,
): Promise<IUser> => {
  const { sub, email, name, picture } = userInfo;

  try {
    // Path 1: Find existing Google user
    const existingGoogleUser = await findUserByGoogleId(sub);
    if (existingGoogleUser) return existingGoogleUser;

    // Path 2: Link to existing email account
    const linkedUser = await linkGoogleToEmailAccount(email, sub, name, picture);
    return linkedUser;

    // Path 3: Create new Google user (handled in catch block for race conditions)
  } catch (error: unknown) {
    // Handle duplicate key errors from race conditions
    if ((error as any).code === 11000) {
      return await handleDuplicateKeyError(error, sub);
    }

    // If linking failed, try creating new user
    if ((error as Error).message.includes("Failed to link Google account")) {
      return await createGoogleUser(userInfo);
    }

    throw error;
  }
};
