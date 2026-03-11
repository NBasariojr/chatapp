import React from "react";
import Icon from "components/AppIcon";

interface OAuthProvider {
  name: string;
  icon: string;
  provider: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

interface OAuthButtonsProps {
  onOAuthLogin?: (provider: string) => void;
  isLoading?: boolean;
}

const oauthProviders: OAuthProvider[] = [
  {
    name: "Google",
    icon: "Chrome",
    provider: "google",
    bgColor: "bg-white hover:bg-gray-50",
    textColor: "text-gray-900",
    borderColor: "border-gray-300",
  },
  {
    name: "GitHub",
    icon: "Github",
    provider: "github",
    bgColor: "bg-gray-900 hover:bg-gray-800",
    textColor: "text-white",
    borderColor: "border-gray-700",
  },
];

const OAuthButtons = ({ onOAuthLogin, isLoading = false }: OAuthButtonsProps) => {
  const handleOAuthClick = (provider: string) => {
    onOAuthLogin?.(provider);
  };

  return (
    <div className="space-y-3">
      {/* Divider */}
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

      {/* Provider Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {oauthProviders.map((provider) => (
          <button
            key={provider.provider}
            type="button"
            onClick={() => handleOAuthClick(provider.provider)}
            disabled={isLoading}
            className={`
              flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg border
              transition-all duration-200 focus:outline-none focus:ring-2
              focus:ring-ring focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
              ${provider.bgColor} ${provider.textColor} ${provider.borderColor}
            `}
          >
            <Icon name={provider.icon} size={18} />
            <span className="text-sm font-medium">{provider.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default OAuthButtons;