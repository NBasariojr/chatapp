import React, { useCallback } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { useDispatch, useSelector } from "react-redux";
import { googleLogin } from "redux/slices/authSlice";
import type { AppDispatch, RootState } from "redux/store";
import { cn } from "lib/utils";

// Google "G" SVG Icon
const GoogleIcon = ({ size = 18 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

// GitHub Icon
const GitHubIcon = ({ size = 18 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

// Spinner
const Spinner = () => (
  <svg
    className="animate-spin h-4 w-4 text-gray-500"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8v8H4z"
    />
  </svg>
);

// Props
interface OAuthButtonsProps {
  onOAuthLogin?: (provider: string) => void;
  isLoading?: boolean;
  className?: string;
}

// Component
const OAuthButtons = ({
  onOAuthLogin,
  isLoading = false,
  className,
}: OAuthButtonsProps) => {
  const dispatch = useDispatch<AppDispatch>();

  const isOAuthLoading = useSelector(
    (state: RootState) => state.auth.isOAuthLoading,
  );
  const oauthError = useSelector((state: RootState) => state.auth.oauthError);

  const isDisabled = isLoading || isOAuthLoading;

  const onSuccess = useCallback(
    (codeResponse: { code: string }) => {
      dispatch(googleLogin(codeResponse.code))
        .unwrap()
        .then(() => {
          onOAuthLogin?.("google");
        })
        .catch((error) => {
          console.error("[Google OAuth] Login failed:", error);
        });
    },
    [dispatch, onOAuthLogin],
  );

  const onError = useCallback((errorResponse: unknown) => {
    console.error("[Google OAuth] Sign-in flow error:", errorResponse);
  }, []);

  const handleGoogleLogin = useGoogleLogin({
    flow: "auth-code",
    onSuccess,
    onError,
  });

  return (
    <div className={cn("space-y-3", className)}>
      {/* Divider*/}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-background text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      {/*Provider Buttons*/}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Google — fully wired */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isDisabled}
          aria-label="Continue with Google"
          className={cn(
            "flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg border",
            "transition-all duration-200 focus:outline-none focus:ring-2",
            "focus:ring-ring focus:ring-offset-2",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "bg-white hover:bg-gray-50 text-gray-900 border-gray-300",
          )}
        >
          {isOAuthLoading ? <Spinner /> : <GoogleIcon size={18} />}
          <span className="text-sm font-medium">Google</span>
        </button>
        <button
          type="button"
          disabled={true}
          aria-label="GitHub sign-in — coming soon"
          title="GitHub sign-in coming soon"
          className={cn(
            "flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg border",
            "bg-gray-900 text-white border-gray-700",
            "opacity-40 cursor-not-allowed",
          )}
        >
          <GitHubIcon size={18} />
          <span className="text-sm font-medium">GitHub</span>
        </button>
      </div>

      {oauthError && (
        <p className="text-sm text-destructive text-center" role="alert">
          {oauthError}
        </p>
      )}
    </div>
  );
};

export default OAuthButtons;
