import React, { useState } from "react";
import Icon from "components/AppIcon";

interface AppImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackIcon?: string;
  className?: string;
}

const AppImage = ({ src, alt, fallbackIcon = "User", className, ...props }: AppImageProps) => {
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div className={`flex items-center justify-center bg-secondary ${className}`}>
        <Icon name={fallbackIcon} size={20} className="text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
      {...props}
    />
  );
};

export default AppImage;