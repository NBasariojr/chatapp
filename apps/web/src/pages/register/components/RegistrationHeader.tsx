import React from "react";
import Icon from "components/AppIcon";

const RegistrationHeader = () => {
  return (
    <div className="text-center space-y-4 mb-8">
      <div className="flex justify-center">
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
          <Icon name="MessageSquare" size={32} color="white" />
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Join LinkUp</h1>
        <p className="text-muted-foreground text-lg">
          Create your account to start connecting with others
        </p>
      </div>

      {/*<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 p-4 bg-card/50 rounded-lg border border-border">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Icon name="Shield" size={16} className="text-primary" />
          <span>Secure messaging</span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Icon name="Users" size={16} className="text-primary" />
          <span>Group chats</span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Icon name="Zap" size={16} className="text-primary" />
          <span>Real-time sync</span>
        </div>
      </div>*/}
    </div>
  );
};

export default RegistrationHeader;