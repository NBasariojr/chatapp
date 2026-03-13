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

// Step 1 + 2: Exchange Code → Verify id_token
export const exchangeAndVerifyGoogleCode = async (
  code: string,
): Promise<GoogleUserInfo> => {
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

  const codeHash = crypto
    .createHash("sha256")
    .update(code)
    .digest("hex")
    .slice(0, 32);
  const codeKey = `oauth_code_used:${codeHash}`;

  try {
    const redis = getRedis();
    const alreadyUsed = await redis.get(codeKey);
    if (alreadyUsed) {
      throw new OAuthVerificationError(
        "Authorization code has already been used",
      );
    }
    await redis.setex(codeKey, 300, "1");
  } catch (err) {
    if (err instanceof OAuthVerificationError) throw err;
    console.error(
      "[googleAuth] Redis code-replay check unavailable:",
      (err as Error).message,
    );
  }

  // Step 1: Exchange authorization code for tokens
  let tokenExchangeRes: Response;
  try {
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
      signal: AbortSignal.timeout(8000),
    });
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
    // Map Google's error codes to user-friendly messages
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

  // Step 2: Verify id_token via POST tokeninfo
  let tokenInfoRes: Response;
  try {
    tokenInfoRes = await fetch("https://oauth2.googleapis.com/tokeninfo", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ id_token: tokens.id_token }).toString(),
      signal: AbortSignal.timeout(5000),
    });
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

  const claims = (await tokenInfoRes.json()) as GoogleIdTokenClaims;

  // Step 3: Validate claims
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
      .replace(/[^a-zA-Z0-9]/g, "")
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

// User Upsert (Account Linking)
export const upsertGoogleUser = async (
  userInfo: GoogleUserInfo,
): Promise<IUser> => {
  const { sub, email, name, picture } = userInfo;

  try {
    // Path 1: Returning Google user
    const byGoogleId = await User.findOneAndUpdate(
      { googleId: sub },
      { $set: { isOnline: true, lastSeen: new Date() } },
      { new: true },
    );
    if (byGoogleId) return byGoogleId;

    // Path 2: Email match — silent account link
    const byEmail = await User.findOneAndUpdate(
      { email, googleId: null },
      {
        $set: {
          googleId: sub,
          authProvider: "both",
          isEmailVerified: true,
          isOnline: true,
          lastSeen: new Date(),
        },
      },
      { new: true },
    );

    if (byEmail) {
      const profileUpdates: Record<string, string> = {};
      if (!byEmail.displayName && name) profileUpdates.displayName = name;
      if (!byEmail.avatar && picture) profileUpdates.avatar = picture;

      if (Object.keys(profileUpdates).length > 0) {
        return (await User.findByIdAndUpdate(
          byEmail._id,
          { $set: profileUpdates },
          { new: true },
        )) as IUser;
      }
      return byEmail;
    }

    // Path 3: New Google user
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
  } catch (error: unknown) {
    const mongoError = error as {
      code?: number;
      keyPattern?: Record<string, number>;
    };

    if (mongoError.code === 11000) {
      const isGoogleIdConflict = "googleId" in (mongoError.keyPattern ?? {});
      const isEmailConflict = "email" in (mongoError.keyPattern ?? {});

      if (isGoogleIdConflict) {
        const existing = await User.findOneAndUpdate(
          { googleId: sub },
          { $set: { isOnline: true, lastSeen: new Date() } },
          { new: true },
        );
        if (existing) return existing;
      }

      if (isEmailConflict) {
        throw new OAuthVerificationError(
          "This email address is already associated with a different account. " +
            "Sign in using your original method.",
        );
      }
    }

    throw error;
  }
};
