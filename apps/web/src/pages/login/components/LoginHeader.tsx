import React from "react";
import Icon from "components/AppIcon";

const LoginHeader = () => {
  return (
    <div className="text-center space-y-4">
      {/* Logo */}
      <div className="flex justify-center">
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
          <Icon name="MessageSquare" size={32} color="white" />
        </div>
      </div>

      {/* Welcome Text */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Welcome back</h1>
        <p className="text-muted-foreground">
          Sign in to your LinkUp account to continue your conversations
        </p>
      </div>
    </div>
  );
};

export default LoginHeader;