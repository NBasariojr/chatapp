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
    </div>
  );
};

export default LoginFooter;