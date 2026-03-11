import React from "react";
import Icon from "components/AppIcon";
import Button from "components/ui/Button";

interface RegistrationSuccessProps {
  userEmail: string;
  onContinue: () => void;
  onResendVerification: () => void;
}

const RegistrationSuccess = ({
  userEmail,
  onContinue,
  onResendVerification,
}: RegistrationSuccessProps) => {
  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
          <Icon name="CheckCircle" size={40} className="text-primary" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Account Created Successfully!</h2>
        <p className="text-muted-foreground">We've sent a verification email to</p>
        <p className="text-foreground font-medium">{userEmail}</p>
      </div>

      <div className="bg-card/50 rounded-lg p-4 border border-border">
        <div className="space-y-3 text-sm text-muted-foreground">
          {[
            { icon: "Mail",        text: "Check your email inbox for the verification link" },
            { icon: "Clock",       text: "The verification link will expire in 24 hours" },
            { icon: "AlertCircle", text: "Don't forget to check your spam folder" },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-start space-x-2">
              <Icon name={icon} size={16} className="text-primary mt-0.5" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Button variant="default" onClick={onContinue} className="w-full">
          Continue to Dashboard
        </Button>
        <Button variant="outline" onClick={onResendVerification} className="w-full">
          Resend Verification Email
        </Button>
      </div>

      <div className="text-xs text-muted-foreground">
        Having trouble? Contact our{" "}
        <button className="text-primary hover:underline">support team</button>
      </div>
    </div>
  );
};

export default RegistrationSuccess;