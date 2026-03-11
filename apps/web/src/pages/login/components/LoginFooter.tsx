import React from "react";

interface LoginFooterProps {
  onNavigateToRegister: () => void;
}

const LoginFooter = ({ onNavigateToRegister }: LoginFooterProps) => {
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-4">
      {/* Registration Link */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={onNavigateToRegister}
            className="text-primary hover:text-primary/80 font-medium transition-colors duration-200 focus:outline-none focus:underline"
          >
            Sign up for free
          </button>
        </p>
      </div>

      {/* Footer Links */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-4 text-xs text-muted-foreground">
          <button
            type="button"
            className="hover:text-foreground transition-colors duration-200 focus:outline-none focus:underline"
          >
            Privacy Policy
          </button>
          <span>•</span>
          <button
            type="button"
            className="hover:text-foreground transition-colors duration-200 focus:outline-none focus:underline"
          >
            Terms of Service
          </button>
          <span>•</span>
          <button
            type="button"
            className="hover:text-foreground transition-colors duration-200 focus:outline-none focus:underline"
          >
            Support
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          © {currentYear} LinkUp. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default LoginFooter;