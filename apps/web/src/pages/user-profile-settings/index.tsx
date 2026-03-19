import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '@chatapp/shared';
import AppIcon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Header from '../../components/ui/Header';             // ← ADD THIS
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

  // ── Same isMobile detection as ChatDashboard ──────────────────────────────
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  useEffect(() => {
    console.log('Loading user profile settings...');
  }, []);

  const showSaveMessage = (message: string) => {
    setSaveMessage(message);
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleUpdateProfile = async (profileData: any) => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      showSaveMessage('Profile updated successfully');
    }, 1000);
  };

  const handleUpdateSecurity = async (securityData: SecurityData) => {
    setIsSaving(true);
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
    setTimeout(() => {
      setIsSaving(false);
      showSaveMessage('Privacy settings updated');
    }, 500);
  };

  const handleUpdateNotifications = async (notificationSettings: NotificationSettingsData) => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      showSaveMessage('Notification preferences updated');
    }, 500);
  };

  const handleDeleteAccount = async (deletionData: DeletionData) => {
    console.log('Account deletion requested:', deletionData);

    if (deletionData?.dataExport) {
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

    setTimeout(() => {
      alert('Account deletion completed. You will be redirected to login page.');
      navigate('/login');
    }, 2000);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileInformation currentUser={currentUser} onUpdateProfile={handleUpdateProfile} />;
      case 'security':
        return <AccountSecurity currentUser={currentUser} onUpdateSecurity={handleUpdateSecurity} />;
      case 'privacy':
        return <PrivacySettings currentUser={currentUser} onUpdatePrivacy={handleUpdatePrivacy} />;
      case 'notifications':
        return <NotificationPreferences currentUser={currentUser} onUpdateNotifications={handleUpdateNotifications} />;
      case 'deletion':
        return <AccountDeletion currentUser={currentUser} onDeleteAccount={handleDeleteAccount} />;
      default:
        return null;
    }
  };

  /*
   * ── Header offset math (mirrors ChatDashboard pattern) ───────────────────
   *
   * Header.tsx structure:
   *   Desktop: single bar           → h-16       = 64px
   *   Mobile:  h-16 bar             = 64px
   *            + md:hidden nav strip = border-t + py-2 + buttons (flex-col py-2
   *              + icon-16 + space-y-1-4 + text-xs ~14px) ≈ 66px
   *            Total mobile          ≈ 130px
   *
   * paddingTop on the scroll container (not margin on outer div) — same
   * technique used in ChatDashboard's style={{ paddingTop: "64px" }}.
   * ─────────────────────────────────────────────────────────────────────────
   */
  const headerOffset = isMobile ? '130px' : '64px';

  return (
    <div className="flex flex-col min-h-screen bg-background">

      {/* ✅ Header rendered inside the page — same as ChatDashboard */}
      <Header />

      {/* ✅ paddingTop clears the fixed header on both breakpoints */}
      <div style={{ paddingTop: headerOffset }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">

          {/* Page Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/chat-dashboard')}
                className="hover:bg-accent/50 shrink-0"
              >
                <AppIcon name="ArrowLeft" size={20} />
              </Button>
              <h1 className="text-xl md:text-2xl font-bold text-foreground leading-tight">
                Account Settings
              </h1>
            </div>
            {/* pl-11 = icon (w-9) + gap (12px) — aligns subtitle under title */}
            <p className="text-muted-foreground text-sm pl-11">
              Manage your profile, security, privacy, and notification preferences
            </p>
          </div>

          {/* Save Message */}
          {saveMessage && (
            <div className="mb-4 bg-success/10 border border-success/20 rounded-lg p-3 animate-scale-in">
              <div className="flex items-center space-x-2">
                <AppIcon name="CheckCircle" size={16} className="text-success" />
                <span className="text-sm text-success font-medium">{saveMessage}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <div className="bg-card border border-border rounded-lg p-4">
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
              <div className="bg-card border border-border rounded-lg p-6">
                {isSaving && (
                  <div className="mb-4 flex items-center space-x-2 text-muted-foreground">
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