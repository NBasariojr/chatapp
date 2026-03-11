import React, { useState } from 'react';
import type { User } from '@chatapp/shared';
import AppIcon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import Select from '../../../components/ui/Select';

interface PrivacySettings {
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

interface PrivacyItem {
  id: keyof PrivacySettings;
  title: string;
  description: string;
  icon: string;
  type: 'checkbox' | 'select';
  value?: any;
  options?: { value: string; label: string }[];
  recommended?: boolean;
}

interface PrivacySettingsProps {
  currentUser: User | null;
  onUpdatePrivacy: (settings: PrivacySettings) => void;
}

const PrivacySettings: React.FC<PrivacySettingsProps> = ({ currentUser, onUpdatePrivacy }) => {
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    messageEncryption: true,
    onlineStatusVisibility: 'everyone',
    readReceipts: true,
    profileVisibility: 'contacts',
    lastSeenVisibility: 'contacts',
    typingIndicators: true,
    messageForwarding: true,
    groupInvites: 'everyone',
    dataCollection: false
  });

  const visibilityOptions = [
    { value: 'everyone', label: 'Everyone' },
    { value: 'contacts', label: 'My Contacts Only' },
    { value: 'nobody', label: 'Nobody' }
  ];

  const groupInviteOptions = [
    { value: 'everyone', label: 'Everyone' },
    { value: 'contacts', label: 'My Contacts Only' },
    { value: 'admins', label: 'Admins Only' },
    { value: 'nobody', label: 'Nobody' }
  ];

  const handleSettingChange = (setting: keyof PrivacySettings, value: any) => {
    const newSettings = {
      ...privacySettings,
      [setting]: value
    };
    setPrivacySettings(newSettings);
    onUpdatePrivacy(newSettings);
  };

  const privacyItems: PrivacyItem[] = [
    {
      id: 'messageEncryption',
      title: 'Message Encryption',
      description: 'Enable end-to-end encryption for all your messages. Only you and the recipient can read encrypted messages.',
      icon: 'Lock',
      type: 'checkbox',
      value: privacySettings?.messageEncryption,
      recommended: true
    },
    {
      id: 'onlineStatusVisibility',
      title: 'Online Status Visibility',
      description: 'Control who can see when you\'re online and active on the platform.',
      icon: 'Eye',
      type: 'select',
      value: privacySettings?.onlineStatusVisibility,
      options: visibilityOptions
    },
    {
      id: 'readReceipts',
      title: 'Read Receipts',
      description: 'Let others know when you\'ve read their messages. Disabling this will also hide read receipts from others.',
      icon: 'CheckCheck',
      type: 'checkbox',
      value: privacySettings?.readReceipts
    },
    {
      id: 'profileVisibility',
      title: 'Profile Visibility',
      description: 'Choose who can view your profile information and status message.',
      icon: 'User',
      type: 'select',
      value: privacySettings?.profileVisibility,
      options: visibilityOptions
    },
    {
      id: 'lastSeenVisibility',
      title: 'Last Seen Visibility',
      description: 'Control who can see when you were last active on the platform.',
      icon: 'Clock',
      type: 'select',
      value: privacySettings?.lastSeenVisibility,
      options: visibilityOptions
    },
    {
      id: 'typingIndicators',
      title: 'Typing Indicators',
      description: 'Show others when you\'re typing a message. Disabling this will also hide typing indicators from others.',
      icon: 'MessageCircle',
      type: 'checkbox',
      value: privacySettings?.typingIndicators
    },
    {
      id: 'messageForwarding',
      title: 'Message Forwarding',
      description: 'Allow others to forward your messages to other conversations.',
      icon: 'Forward',
      type: 'checkbox',
      value: privacySettings?.messageForwarding
    },
    {
      id: 'groupInvites',
      title: 'Group Invitations',
      description: 'Control who can add you to group conversations.',
      icon: 'Users',
      type: 'select',
      value: privacySettings?.groupInvites,
      options: groupInviteOptions
    },
    {
      id: 'dataCollection',
      title: 'Analytics & Data Collection',
      description: 'Allow collection of usage analytics to help improve the platform. No personal messages are included.',
      icon: 'BarChart3',
      type: 'checkbox',
      value: privacySettings?.dataCollection
    }
  ];

  const handleExportData = () => {
    // Mock data export functionality
    const exportData = {
      profile: {
        username: currentUser?.username,
        email: currentUser?.email,
        displayName: currentUser?.username,
        memberSince: "January 15, 2024"
      },
      settings: privacySettings,
      messageCount: 1247,
      conversationCount: 23,
      exportDate: new Date()?.toISOString()
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chatflow-data-export-${new Date()?.toISOString()?.split('T')?.[0]}.json`;
    link?.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Privacy Settings */}
      <div className="space-y-4">
        {privacyItems?.map((item) => (
          <div key={item?.id} className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                <AppIcon name={item?.icon} size={20} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-medium text-foreground">
                      {item?.title}
                    </h4>
                    {item?.recommended && (
                      <span className="px-2 py-1 bg-success/20 text-success text-xs rounded-full">
                        Recommended
                      </span>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    {item?.type === 'checkbox' ? (
                      <Checkbox
                        checked={item?.value}
                        onChange={(e) => handleSettingChange(item?.id, e?.target?.checked)}
                      />
                    ) : (
                      <div className="w-48">
                        <Select
                          options={item?.options}
                          value={item?.value}
                          onChange={(value) => handleSettingChange(item?.id, value)}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {item?.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Data Management */}
      <div className="border-t border-border pt-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Data Management</h3>
        
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
              <AppIcon name="Download" size={20} className="text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-foreground mb-2">
                Export Your Data
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                Download a copy of your account information, settings, and message metadata. This export does not include message content for privacy reasons.
              </p>
              <Button
                variant="outline"
                onClick={handleExportData}
                iconName="Download"
                iconPosition="left"
              >
                Export Data
              </Button>
            </div>
          </div>
        </div>
      </div>
      {/* Privacy Notice */}
      <div className="bg-muted/50 border border-border rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <AppIcon name="Info" size={20} className="text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">
              Privacy Notice
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your privacy is important to us. These settings help you control how your information is shared and used within ChatFlow. 
              Changes to privacy settings take effect immediately and apply to all your conversations. 
              For more information about our privacy practices, please review our Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacySettings;