import React, { useState, useEffect } from 'react';
import type { User } from '@chatapp/shared';
import AppIcon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import Select from '../../../components/ui/Select';

interface NotificationSettings {
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

interface NotificationItem {
  id: keyof NotificationSettings;
  title: string;
  description: string;
  icon: string;
  type: 'checkbox' | 'select';
  value?: any;
  options?: { value: string; label: string }[];
  disabled?: boolean;
}

interface NotificationCategory {
  title: string;
  items: NotificationItem[];
}

interface NotificationPreferencesProps {
  currentUser: User | null;
  onUpdateNotifications: (settings: NotificationSettings) => void;
}

const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({ currentUser, onUpdateNotifications }) => {
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    browserPush: currentUser?.notificationSettings?.browserPush || true,
    emailNotifications: currentUser?.notificationSettings?.emailNotifications || true,
    mentionAlerts: currentUser?.notificationSettings?.mentionAlerts || true,
    messagePreview: currentUser?.notificationSettings?.messagePreview || true,
    soundEnabled: currentUser?.notificationSettings?.soundEnabled || true,
    soundType: currentUser?.notificationSettings?.soundType || 'default',
    quietHours: currentUser?.notificationSettings?.quietHours || false,
    quietStart: currentUser?.notificationSettings?.quietStart || '22:00',
    quietEnd: currentUser?.notificationSettings?.quietEnd || '08:00',
    groupNotifications: currentUser?.notificationSettings?.groupNotifications || 'mentions',
    directMessages: currentUser?.notificationSettings?.directMessages || 'all',
    vibration: currentUser?.notificationSettings?.vibration || true
  });

  const [isTestingSound, setIsTestingSound] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState('default');

  const soundOptions = [
    { value: 'default', label: 'Default' },
    { value: 'chime', label: 'Chime' },
    { value: 'bell', label: 'Bell' },
    { value: 'pop', label: 'Pop' },
    { value: 'none', label: 'None' }
  ];

  const groupNotificationOptions = [
    { value: 'all', label: 'All Messages' },
    { value: 'mentions', label: 'Mentions Only' },
    { value: 'none', label: 'None' }
  ];

  const directMessageOptions = [
    { value: 'all', label: 'All Messages' },
    { value: 'contacts', label: 'Contacts Only' },
    { value: 'none', label: 'None' }
  ];

  React.useEffect(() => {
    // Check notification permission status
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  const handleSettingChange = (setting: keyof NotificationSettings, value: any) => {
    const newSettings = {
      ...notificationSettings,
      [setting]: value
    };
    setNotificationSettings(newSettings);
    onUpdateNotifications(newSettings);
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      if (permission === 'granted') {
        handleSettingChange('browserPush', true);
      }
    }
  };

  const testSound = () => {
    setIsTestingSound(true);
    
    // Mock sound test
    setTimeout(() => {
      setIsTestingSound(false);
    }, 1000);
    
    // In a real app, you would play the selected sound here
    console.log(`Testing sound: ${notificationSettings?.soundType}`);
  };

  const testNotification = () => {
    if (permissionStatus === 'granted') {
      new Notification('ChatFlow Test', {
        body: 'This is a test notification from ChatFlow',
        icon: '/favicon.ico',
        tag: 'test-notification'
      });
    }
  };

  const notificationCategories: NotificationCategory[] = [
    {
      title: 'Browser Notifications',
      items: [
        {
          id: 'browserPush',
          title: 'Push Notifications',
          description: 'Receive notifications in your browser even when ChatFlow is not open',
          icon: 'Bell',
          type: 'checkbox',
          value: notificationSettings?.browserPush && permissionStatus === 'granted',
          disabled: permissionStatus === 'denied'
        },
        {
          id: 'messagePreview',
          title: 'Message Preview',
          description: 'Show message content in notifications (disable for privacy)',
          icon: 'Eye',
          type: 'checkbox',
          value: notificationSettings?.messagePreview,
          disabled: !notificationSettings?.browserPush || permissionStatus !== 'granted'
        }
      ]
    },
    {
      title: 'Sound & Vibration',
      items: [
        {
          id: 'soundEnabled',
          title: 'Notification Sounds',
          description: 'Play a sound when you receive new messages',
          icon: 'Volume2',
          type: 'checkbox',
          value: notificationSettings?.soundEnabled,
          disabled: false
        },
        {
          id: 'soundType',
          title: 'Sound Type',
          description: 'Choose the notification sound',
          icon: 'Music',
          type: 'select',
          value: notificationSettings?.soundType,
          options: soundOptions,
          disabled: !notificationSettings?.soundEnabled
        },
        {
          id: 'vibration',
          title: 'Vibration',
          description: 'Vibrate device for notifications (mobile only)',
          icon: 'Smartphone',
          type: 'checkbox',
          value: notificationSettings?.vibration,
          disabled: false
        }
      ]
    },
    {
      title: 'Message Notifications',
      items: [
        {
          id: 'directMessages',
          title: 'Direct Messages',
          description: 'Control notifications for one-on-one conversations',
          icon: 'MessageCircle',
          type: 'select',
          value: notificationSettings?.directMessages,
          options: directMessageOptions,
          disabled: false
        },
        {
          id: 'groupNotifications',
          title: 'Group Messages',
          description: 'Control notifications for group conversations',
          icon: 'Users',
          type: 'select',
          value: notificationSettings?.groupNotifications,
          options: groupNotificationOptions,
          disabled: false
        },
        {
          id: 'mentionAlerts',
          title: 'Mention Alerts',
          description: 'Get notified when someone mentions you in a conversation',
          icon: 'AtSign',
          type: 'checkbox',
          value: notificationSettings?.mentionAlerts,
          disabled: false
        }
      ]
    },
    {
      title: 'Email Notifications',
      items: [
        {
          id: 'emailNotifications',
          title: 'Email Notifications',
          description: 'Receive email summaries of missed messages',
          icon: 'Mail',
          type: 'checkbox',
          value: notificationSettings?.emailNotifications,
          disabled: false
        }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {/* Permission Status */}
      {permissionStatus !== 'granted' && (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AppIcon name="AlertTriangle" size={20} className="text-warning flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-foreground mb-2">
                Browser Notifications Disabled
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                {permissionStatus === 'denied' ?'You have blocked notifications for this site. Please enable them in your browser settings.' :'Enable browser notifications to receive real-time alerts for new messages.'
                }
              </p>
              {permissionStatus === 'default' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={requestNotificationPermission}
                  iconName="Bell"
                  iconPosition="left"
                >
                  Enable Notifications
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Notification Categories */}
      {notificationCategories?.map((category) => (
        <div key={category?.title}>
          <h3 className="text-lg font-semibold text-foreground mb-4">{category?.title}</h3>
          <div className="space-y-4">
            {category?.items?.map((item) => (
              <div key={item?.id} className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                    <AppIcon 
                      name={item?.icon} 
                      size={20} 
                      className={item?.disabled ? "text-muted-foreground" : "text-primary"} 
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className={`text-sm font-medium ${item?.disabled ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {item?.title}
                      </h4>
                      <div className="flex-shrink-0">
                        {item?.type === 'checkbox' ? (
                          <Checkbox
                            checked={item?.value}
                            onChange={(e) => handleSettingChange(item?.id, e?.target?.checked)}
                            disabled={item?.disabled}
                          />
                        ) : (
                          <div className="w-48">
                            <Select
                              options={item?.options}
                              value={item?.value}
                              onChange={(value) => handleSettingChange(item?.id, value)}
                              disabled={item?.disabled}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <p className={`text-sm ${item?.disabled ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
                      {item?.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {/* Quiet Hours */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">Quiet Hours</h3>
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
              <AppIcon name="Moon" size={20} className="text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-foreground">
                  Enable Quiet Hours
                </h4>
                <Checkbox
                  checked={notificationSettings?.quietHours}
                  onChange={(e) => handleSettingChange('quietHours', e?.target?.checked)}
                />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Disable notifications during specific hours to avoid interruptions during sleep or focus time.
              </p>
              
              {notificationSettings?.quietHours && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={notificationSettings?.quietStart}
                      onChange={(e) => handleSettingChange('quietStart', e?.target?.value)}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={notificationSettings?.quietEnd}
                      onChange={(e) => handleSettingChange('quietEnd', e?.target?.value)}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Test Notifications */}
      <div className="border-t border-border pt-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Test Notifications</h3>
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            <Button
              variant="outline"
              onClick={testSound}
              loading={isTestingSound}
              iconName="Volume2"
              iconPosition="left"
              disabled={!notificationSettings?.soundEnabled}
            >
              Test Sound
            </Button>
            <Button
              variant="outline"
              onClick={testNotification}
              iconName="Bell"
              iconPosition="left"
              disabled={permissionStatus !== 'granted' || !notificationSettings?.browserPush}
            >
              Test Notification
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            Use these buttons to test your notification settings and ensure they work as expected.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotificationPreferences;