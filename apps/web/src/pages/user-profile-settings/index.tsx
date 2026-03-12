import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '@chatapp/shared';
import AppIcon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import ProfileInformation from './components/ProfileInformation';
import AccountSecurity from './components/AccountSecurity';
import PrivacySettings from './components/PrivacySettings';
import NotificationPreferences from './components/NotificationPreferences';
import AccountDeletion from './components/AccountDeletion';

interface PrivacySettingsData {
  messageEncryption?: boolean;
  onlineStatusVisibility?: string;
  readReceipts?: boolean;
  profileVisibility?: string;
  lastSeenVisibility?: string;
  typingIndicators?: boolean;
  messageForwarding?: boolean;
  groupInvites?: string;
  dataCollection?: boolean;
}

interface NotificationSettingsData {
  browserPush?: boolean;
  emailNotifications?: boolean;
  mentionAlerts?: boolean;
  messagePreview?: boolean;
  soundEnabled?: boolean;
  soundType?: string;
  quietHours?: boolean;
  quietStart?: string;
  quietEnd?: string;
  groupNotifications?: string;
  directMessages?: string;
  vibration?: boolean;
}

interface ExtendedUser extends User {
  displayName?: string;
  statusMessage?: string;
  privacySettings?: PrivacySettingsData;
  notificationSettings?: NotificationSettingsData;
}

interface TabItem {
  id: string;
  label: string;
  icon: string;
  description: string;
  variant?: 'default' | 'destructive';
}

interface NotificationCounts {
  messages: number;
  groups: number;
  total: number;
}

interface SecurityData {
  type: 'password' | 'twoFactor' | 'terminateSession';
  data?: any;
}

interface DeletionData {
  reason?: string;
  dataExport?: boolean;
}

interface UserProfileSettingsProps {
  currentUser: ExtendedUser | null;
}

const UserProfileSettings: React.FC<UserProfileSettingsProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('profile');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>('');

  const tabs: TabItem[] = [
    {
      id: 'profile',
      label: 'Profile',
      icon: 'User',
      description: 'Personal information and avatar'
    },
    {
      id: 'security',
      label: 'Security',
      icon: 'Shield',
      description: 'Password and authentication'
    },
    {
      id: 'privacy',
      label: 'Privacy',
      icon: 'Lock',
      description: 'Privacy controls and data settings'
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: 'Bell',
      description: 'Alert preferences and sounds'
    },
    {
      id: 'deletion',
      label: 'Delete Account',
      icon: 'Trash2',
      description: 'Permanently remove your account',
      variant: 'destructive'
    }
  ];

  const notificationCounts: NotificationCounts = {
    messages: 3,
    groups: 1,
    total: 4
  };

  useEffect(() => {
    // Simulate loading user data
    const loadUserData = () => {
      // In a real app, this would fetch from an API
      console.log('Loading user profile settings...');
    };
    
    loadUserData();
  }, []);

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const showSaveMessage = (message: string, type: 'success' | 'error' = 'success') => {
    setSaveMessage(message);
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleUpdateProfile = async (profileData: any) => {
    setIsSaving(true);
    
    // In a real app, this would make an API call to update the profile
    // For now, just show success message
    setTimeout(() => {
      setIsSaving(false);
      showSaveMessage('Profile updated successfully');
    }, 1000);
  };

  const handleUpdateSecurity = async (securityData: SecurityData) => {
    setIsSaving(true);
    
    // In a real app, this would make an API call to update security settings
    setTimeout(() => {
      if (securityData?.type === 'password') {
        showSaveMessage('Password updated successfully');
      } else if (securityData?.type === 'twoFactor') {
        showSaveMessage(
          securityData?.data?.enabled 
            ? 'Two-factor authentication enabled' 
            : 'Two-factor authentication disabled'
        );
      } else if (securityData?.type === 'terminateSession') {
        showSaveMessage('Session terminated successfully');
      }
      setIsSaving(false);
    }, 1000);
  };

  const handleUpdatePrivacy = async (privacySettings: PrivacySettingsData) => {
    setIsSaving(true);
    
    // In a real app, this would make an API call to update privacy settings
    setTimeout(() => {
      setIsSaving(false);
      showSaveMessage('Privacy settings updated');
    }, 500);
  };

  const handleUpdateNotifications = async (notificationSettings: NotificationSettingsData) => {
    setIsSaving(true);
    
    // In a real app, this would make an API call to update notification settings
    setTimeout(() => {
      setIsSaving(false);
      showSaveMessage('Notification preferences updated');
    }, 500);
  };

  const handleDeleteAccount = async (deletionData: DeletionData) => {
    // In a real app, this would handle account deletion
    console.log('Account deletion requested:', deletionData);
    
    if (deletionData?.dataExport) {
      // Trigger data export
      const exportData = {
        profile: currentUser,
        deletionReason: deletionData?.reason,
        exportDate: new Date().toISOString()
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `chatflow-account-export-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
    
    // Simulate account deletion process
    setTimeout(() => {
      alert('Account deletion completed. You will be redirected to login page.');
      navigate('/login');
    }, 2000);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <ProfileInformation
            currentUser={currentUser}
            onUpdateProfile={handleUpdateProfile}
          />
        );
      case 'security':
        return (
          <AccountSecurity
            currentUser={currentUser}
            onUpdateSecurity={handleUpdateSecurity}
          />
        );
      case 'privacy':
        return (
          <PrivacySettings
            currentUser={currentUser}
            onUpdatePrivacy={handleUpdatePrivacy}
          />
        );
      case 'notifications':
        return (
          <NotificationPreferences
            currentUser={currentUser}
            onUpdateNotifications={handleUpdateNotifications}
          />
        );
      case 'deletion':
        return (
          <AccountDeletion
            currentUser={currentUser}
            onDeleteAccount={handleDeleteAccount}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/chat-dashboard')}
                className="hover:bg-accent/50"
              >
                <AppIcon name="ArrowLeft" size={20} />
              </Button>
              <h1 className="text-3xl font-bold text-foreground">Account Settings</h1>
            </div>
            <p className="text-muted-foreground">
              Manage your profile, security, privacy, and notification preferences
            </p>
          </div>

          {/* Save Message */}
          {saveMessage && (
            <div className="mb-6 bg-success/10 border border-success/20 rounded-lg p-4 animate-scale-in">
              <div className="flex items-center space-x-2">
                <AppIcon name="CheckCircle" size={16} className="text-success" />
                <span className="text-sm text-success font-medium">{saveMessage}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <div className="bg-card border border-border rounded-lg p-4 sticky top-24">
                <nav className="space-y-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-left transition-colors duration-200
                        ${activeTab === tab.id
                          ? 'bg-primary/10 text-primary border border-primary/20'
                          : tab.variant === 'destructive' 
                            ? 'hover:bg-error/10 text-muted-foreground hover:text-error' 
                            : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'
                        }
                      `}
                    >
                      <AppIcon 
                        name={tab.icon} 
                        size={18} 
                        className={
                          activeTab === tab.id
                            ? 'text-primary'
                            : tab.variant === 'destructive' 
                              ? 'text-muted-foreground group-hover:text-error' 
                              : 'text-muted-foreground'
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{tab.label}</div>
                        <div className="text-xs opacity-75 truncate">{tab.description}</div>
                      </div>
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <div className="bg-card border border-border rounded-lg p-6 min-h-[600px]">
                {isSaving && (
                  <div className="mb-6 flex items-center space-x-2 text-muted-foreground">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm">Saving changes...</span>
                  </div>
                )}
                {renderTabContent()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileSettings;