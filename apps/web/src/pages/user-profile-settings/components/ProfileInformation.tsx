import React, { useState } from 'react';
import type { User } from '@chatapp/shared';
import AppIcon from '../../../components/AppIcon';
import AppImage from '../../../components/AppImage';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

interface ProfileData {
  username: string;
  email: string;
  displayName: string;
  statusMessage: string;
  avatar: string;
}

interface ProfileErrors {
  username?: string;
  email?: string;
  displayName?: string;
  statusMessage?: string;
  avatar?: string;
}

interface ProfileInformationProps {
  currentUser: User | null;
  onUpdateProfile: (profileData: ProfileData) => void;
}

const ProfileInformation: React.FC<ProfileInformationProps> = ({ currentUser, onUpdateProfile }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    username: currentUser?.username || "john_doe",
    email: currentUser?.email || "john.doe@example.com",
    displayName: currentUser?.username || "John Doe",
    statusMessage: "Available for chat",
    avatar: currentUser?.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
  });
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [isUploading, setIsUploading] = useState(false);

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors?.[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ProfileErrors = {};
    
    if (!profileData?.username?.trim()) {
      newErrors.username = 'Username is required';
    } else if (profileData?.username?.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    
    if (!profileData?.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData?.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!profileData?.displayName?.trim()) {
      newErrors.displayName = 'Display name is required';
    }
    
    if (profileData?.statusMessage?.length > 100) {
      newErrors.statusMessage = 'Status message must be less than 100 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onUpdateProfile(profileData);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setProfileData({
      username: currentUser?.username || "john_doe",
      email: currentUser?.email || "john.doe@example.com",
      displayName: currentUser?.username || "John Doe",
      statusMessage: "Available for chat",
      avatar: currentUser?.avatar || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
    });
    setErrors({});
    setIsEditing(false);
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event?.target?.files?.[0];
    if (file) {
      if (file?.size > 5 * 1024 * 1024) {
        setErrors(prev => ({
          ...prev,
          avatar: 'Image size must be less than 5MB'
        }));
        return;
      }
      
      setIsUploading(true);
      
      // Simulate upload process
      setTimeout(() => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setProfileData(prev => ({
            ...prev,
            avatar: e?.target?.result as string
          }));
          setIsUploading(false);
          setErrors(prev => ({
            ...prev,
            avatar: ''
          }));
        };
        reader.readAsDataURL(file);
      }, 1000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Picture Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-secondary border-4 border-border">
            {isUploading ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <AppImage
                src={profileData?.avatar}
                alt="Profile Avatar"
                className="w-full h-full object-cover"
              />
            )}
          </div>
          {isEditing && (
            <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary hover:bg-primary/90 rounded-full flex items-center justify-center cursor-pointer transition-colors duration-200">
              <AppIcon name="Camera" size={16} className="text-white" />
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </label>
          )}
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground mb-1">Profile Picture</h3>
          <p className="text-sm text-muted-foreground mb-2">
            Upload a profile picture to help others recognize you in chats.
          </p>
          {errors?.avatar && (
            <p className="text-sm text-error">{errors?.avatar}</p>
          )}
          {isEditing && (
            <p className="text-xs text-muted-foreground">
              Recommended: Square image, at least 150x150px, max 5MB
            </p>
          )}
        </div>
      </div>
      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Username"
          type="text"
          value={profileData?.username}
          onChange={(e) => handleInputChange('username', e?.target?.value)}
          disabled={!isEditing}
          error={errors?.username}
          description="Your unique identifier for platform"
          required
        />
        
        <Input
          label="Email Address"
          type="email"
          value={profileData?.email}
          onChange={(e) => handleInputChange('email', e?.target?.value)}
          disabled={!isEditing}
          error={errors?.email}
          description="Used for notifications and account recovery"
          required
        />
      </div>
      <Input
        label="Display Name"
        type="text"
        value={profileData?.displayName}
        onChange={(e) => handleInputChange('displayName', e?.target?.value)}
        disabled={!isEditing}
        error={errors?.displayName}
        description="How your name appears to other users"
        required
      />
      <Input
        label="Status Message"
        type="text"
        value={profileData?.statusMessage}
        onChange={(e) => handleInputChange('statusMessage', e?.target?.value)}
        disabled={!isEditing}
        error={errors?.statusMessage}
        description={`Let others know what you're up to (${profileData?.statusMessage?.length}/100)`}
        maxLength={100}
      />
      {/* Account Information (Read-only) */}
      <div className="border-t border-border pt-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Account Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Member Since
            </label>
            <div className="px-3 py-2 bg-muted rounded-lg text-sm text-muted-foreground">
              January 15, 2024
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Account Type
            </label>
            <div className="px-3 py-2 bg-muted rounded-lg text-sm text-muted-foreground">
              {currentUser?.role === 'admin' ? 'Administrator' : 'Standard User'}
            </div>
          </div>
        </div>
      </div>
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-6 border-t border-border">
        {isEditing ? (
          <>
            <Button
              variant="outline"
              onClick={handleCancel}
              className="sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleSave}
              className="sm:w-auto"
            >
              Save Changes
            </Button>
          </>
        ) : (
          <Button
            variant="default"
            onClick={() => setIsEditing(true)}
            iconName="Edit"
            iconPosition="left"
            className="sm:w-auto"
          >
            Edit Profile
          </Button>
        )}
      </div>
    </div>
  );
};

export default ProfileInformation;