import React, { useState } from 'react';
import type { User } from '@chatapp/shared';
import AppIcon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Checkbox } from '../../../components/ui/Checkbox';

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ShowPasswords {
  current: boolean;
  new: boolean;
  confirm: boolean;
}

interface Errors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

interface ActiveSession {
  id: number;
  device: string;
  location: string;
  ipAddress: string;
  lastActive: string;
  isCurrent: boolean;
}

interface AccountSecurityProps {
  currentUser: User | null;
  onUpdateSecurity: (data: { 
    type: 'password' | 'twoFactor' | 'terminateSession';
    data: { newPassword?: string; enabled?: boolean; sessionId?: number }
  }) => void;
}

const AccountSecurity: React.FC<AccountSecurityProps> = ({ currentUser, onUpdateSecurity }) => {
  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(currentUser?.twoFactorEnabled || false);
  const [errors, setErrors] = useState<Errors>({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState<ShowPasswords>({
    current: false,
    new: false,
    confirm: false
  });

  // Mock active sessions data
  const activeSessions: ActiveSession[] = [
    {
      id: 1,
      device: "Chrome on Windows",
      location: "New York, NY",
      ipAddress: "192.168.1.100",
      lastActive: "Active now",
      isCurrent: true
    },
    {
      id: 2,
      device: "Safari on iPhone",
      location: "New York, NY",
      ipAddress: "192.168.1.101",
      lastActive: "2 hours ago",
      isCurrent: false
    },
    {
      id: 3,
      device: "Chrome on Android",
      location: "Brooklyn, NY",
      ipAddress: "192.168.1.102",
      lastActive: "1 day ago",
      isCurrent: false
    }
  ];

  const handlePasswordChange = (field: keyof PasswordData, value: string) => {
    setPasswordData(prev => ({
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

  const validatePasswordForm = (): boolean => {
    const newErrors: Errors = {};
    
    if (!passwordData?.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }
    
    if (!passwordData?.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordData?.newPassword?.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData?.newPassword)) {
      newErrors.newPassword = 'Password must contain uppercase, lowercase, and number';
    }
    
    if (!passwordData?.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (passwordData?.newPassword !== passwordData?.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors)?.length === 0;
  };

  const handlePasswordSubmit = () => {
    if (validatePasswordForm()) {
      // In a real app, you'd validate the password against the backend
      // For now, we'll proceed with the update
      onUpdateSecurity({
        type: 'password',
        data: { newPassword: passwordData?.newPassword }
      });
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setIsChangingPassword(false);
    }
  };

  const handleTwoFactorToggle = (enabled: boolean) => {
    setTwoFactorEnabled(enabled);
    onUpdateSecurity({
      type: 'twoFactor',
      data: { enabled }
    });
  };

  const handleSessionTerminate = (sessionId: number) => {
    onUpdateSecurity({
      type: 'terminateSession',
      data: { sessionId }
    });
  };

  const togglePasswordVisibility = (field: keyof ShowPasswords) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev?.[field]
    }));
  };

  return (
    <div className="space-y-8">
      {/* Password Change Section */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Change Password</h3>
        <div className="bg-card border border-border rounded-lg p-6">
          {!isChangingPassword ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground mb-1">Password</p>
                <p className="text-sm text-muted-foreground">
                  Last changed on December 15, 2024
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setIsChangingPassword(true)}
                iconName="Key"
                iconPosition="left"
              >
                Change Password
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <Input
                  label="Current Password"
                  type={showPasswords?.current ? "text" : "password"}
                  value={passwordData?.currentPassword}
                  onChange={(e) => handlePasswordChange('currentPassword', e?.target?.value)}
                  error={errors?.currentPassword}
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('current')}
                  className="absolute right-3 top-9 text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  <AppIcon name={showPasswords?.current ? "EyeOff" : "Eye"} size={16} />
                </button>
              </div>
              
              <div className="relative">
                <Input
                  label="New Password"
                  type={showPasswords?.new ? "text" : "password"}
                  value={passwordData?.newPassword}
                  onChange={(e) => handlePasswordChange('newPassword', e?.target?.value)}
                  error={errors?.newPassword}
                  description="Must be at least 8 characters with uppercase, lowercase, and number"
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute right-3 top-9 text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  <AppIcon name={showPasswords?.new ? "EyeOff" : "Eye"} size={16} />
                </button>
              </div>
              
              <div className="relative">
                <Input
                  label="Confirm New Password"
                  type={showPasswords?.confirm ? "text" : "password"}
                  value={passwordData?.confirmPassword}
                  onChange={(e) => handlePasswordChange('confirmPassword', e?.target?.value)}
                  error={errors?.confirmPassword}
                  required
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute right-3 top-9 text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  <AppIcon name={showPasswords?.confirm ? "EyeOff" : "Eye"} size={16} />
                </button>
              </div>
              
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setPasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    });
                    setErrors({});
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={handlePasswordSubmit}
                >
                  Update Password
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Two-Factor Authentication */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Two-Factor Authentication</h3>
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
              <AppIcon name="Shield" size={20} className="text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-foreground">
                  Two-Factor Authentication
                </h4>
                <Checkbox
                  checked={twoFactorEnabled}
                  onChange={(e) => handleTwoFactorToggle(e?.target?.checked)}
                />
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Add an extra layer of security to your account by requiring a verification code in addition to your password.
              </p>
              {twoFactorEnabled && (
                <div className="bg-success/10 border border-success/20 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <AppIcon name="CheckCircle" size={16} className="text-success" />
                    <span className="text-sm text-success">Two-factor authentication is enabled</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Active Sessions */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Active Sessions</h3>
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-sm text-muted-foreground mb-4">
            These are the devices and locations where you're currently signed in.
          </p>
          <div className="space-y-4">
            {activeSessions?.map((session) => (
              <div key={session?.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                    <AppIcon 
                      name={session?.device?.includes('iPhone') ? "Smartphone" : 
                            session?.device?.includes('Android') ? "Smartphone" : "Monitor"} 
                      size={20} 
                    />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-foreground">{session?.device}</p>
                      {session?.isCurrent && (
                        <span className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {session?.location} • {session?.ipAddress}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session?.lastActive}
                    </p>
                  </div>
                </div>
                {!session?.isCurrent && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSessionTerminate(session?.id)}
                    iconName="LogOut"
                    iconPosition="left"
                  >
                    Sign Out
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSecurity;