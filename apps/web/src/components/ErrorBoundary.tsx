import * as Sentry from "@sentry/react";
import React from "react";
import Icon from "components/AppIcon";

// ─── Fallback UI ──────────────────────────────────────────────────────────────

interface FallbackProps {
  readonly error: Error;
  readonly resetError: () => void;
  readonly eventId: string | null;
}

function ErrorFallback({ error, resetError, eventId }: FallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center p-8 max-w-md">
        <div className="flex justify-center items-center mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="42"
            height="42"
            viewBox="0 0 32 33"
            fill="none"
          >
            <path
              d="M16 28.5C22.6274 28.5 28 23.1274 28 16.5C28 9.87258 22.6274 4.5 16 4.5C9.37258 4.5 4 9.87258 4 16.5C4 23.1274 9.37258 28.5 16 28.5Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeMiterlimit="10"
              className="text-muted-foreground"
            />
            <path
              d="M11.5 15.5C12.3284 15.5 13 14.8284 13 14C13 13.1716 12.3284 12.5 11.5 12.5C10.6716 12.5 10 13.1716 10 14C10 14.8284 10.6716 15.5 11.5 15.5Z"
              fill="currentColor"
              className="text-foreground"
            />
            <path
              d="M20.5 15.5C21.3284 15.5 22 14.8284 22 14C22 13.1716 21.3284 12.5 20.5 12.5C19.6716 12.5 19 13.1716 19 14C19 14.8284 19.6716 15.5 20.5 15.5Z"
              fill="currentColor"
              className="text-foreground"
            />
            <path
              d="M21 22.5C19.9625 20.7062 18.2213 19.5 16 19.5C13.7787 19.5 12.0375 20.7062 11 22.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground"
            />
          </svg>
        </div>
        <div className="flex flex-col gap-1 text-center mb-6">
          <h1 className="text-2xl font-medium text-foreground">
            Something went wrong
          </h1>
          <p className="text-muted-foreground text-base w-8/12 mx-auto">
            We encountered an unexpected error while processing your request.
          </p>
          {/* Show Sentry event ID in production for support tickets */}
          {eventId && (
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              Error ID: {eventId}
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={resetError}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors duration-200"
          >
            <Icon name="RefreshCw" size={18} />
            Try Again
          </button>
          <button
            onClick={() => {
              globalThis.location.href = "/";
            }}
            className="border border-border hover:bg-accent text-foreground font-medium py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors duration-200"
          >
            <Icon name="ArrowLeft" size={18} />
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sentry-wrapped ErrorBoundary ─────────────────────────────────────────────

interface ErrorBoundaryProps {
  readonly children: React.ReactNode;
}

function ErrorBoundary({ children }: ErrorBoundaryProps) {
  return (
    <Sentry.ErrorBoundary
      fallback={ErrorFallback}
      // Attach componentStack to the Sentry event for better debugging
      showDialog={false}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}

export default ErrorBoundary;
