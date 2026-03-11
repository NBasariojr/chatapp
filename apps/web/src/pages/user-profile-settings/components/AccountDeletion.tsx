import React, { useState } from 'react';
import type { User } from '@chatapp/shared';
import AppIcon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { Checkbox } from '../../../components/ui/Checkbox';

interface DeletionData {
  password: string;
  confirmText: string;
  reason: string;
  dataExport: boolean;
  understanding: boolean;
}

interface Errors {
  password?: string;
  confirmText?: string;
  understanding?: string;
}

interface DeletionConsequence {
  icon: string;
  title: string;
  description: string;
}

interface AccountDeletionProps {
  currentUser: User | null;
  onDeleteAccount: (data: { reason?: string; dataExport: boolean }) => void;
}

const AccountDeletion: React.FC<AccountDeletionProps> = ({ currentUser, onDeleteAccount }) => {
  const [showDeletionForm, setShowDeletionForm] = useState(false);
  const [deletionData, setDeletionData] = useState<DeletionData>({
    password: '',
    confirmText: '',
    reason: '',
    dataExport: false,
    understanding: false
  });
  const [errors, setErrors] = useState<Errors>({});
  const [isDeleting, setIsDeleting] = useState(false);

  const handleInputChange = (field: keyof DeletionData, value: string | boolean) => {
    setDeletionData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors?.[field as keyof Errors]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateDeletionForm = (): boolean => {
    const newErrors: Errors = {};
    
    if (!deletionData?.password) {
      newErrors.password = 'Password is required to delete account';
    }
    
    if (deletionData?.confirmText !== 'DELETE MY ACCOUNT') {
      newErrors.confirmText = 'Please type "DELETE MY ACCOUNT" exactly as shown';
    }
    
    if (!deletionData?.understanding) {
      newErrors.understanding = 'You must acknowledge the consequences of account deletion';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors)?.length === 0;
  };

  const handleDeleteAccount = async () => {
    if (validateDeletionForm()) {
      // In a real app, you'd validate the password against the backend
      // For now, we'll proceed with the deletion
      setIsDeleting(true);
      
      // Simulate deletion process
      setTimeout(() => {
        onDeleteAccount({
          reason: deletionData?.reason,
          dataExport: deletionData?.dataExport
        });
        setIsDeleting(false);
      }, 2000);
    }
  };

  const deletionConsequences: DeletionConsequence[] = [
    {
      icon: 'MessageCircle',
      title: 'Message History',
      description: 'All your messages and conversation history will be permanently deleted'
    },
    {
      icon: 'Users',
      title: 'Group Memberships',
      description: 'You will be removed from all group conversations'
    },
    {
      icon: 'User',
      title: 'Profile Information',
      description: 'Your profile, settings, and account data will be completely removed'
    },
    {
      icon: 'Clock',
      title: 'Recovery Period',
      description: 'Account deletion is immediate and cannot be undone after confirmation'
    }
  ];

  const reasonOptions = [
    "I no longer need this service",
    "Privacy concerns",
    "Found a better alternative",
    "Too many notifications",
    "Technical issues",
    "Other"
  ];

  if (!showDeletionForm) {
    return (
      <div className="space-y-6">
        {/* Warning Section */}
        <div className="bg-error/10 border border-error/20 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <AppIcon name="AlertTriangle" size={24} className="text-error flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-error mb-2">
                Delete Account
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Account deletion is permanent and cannot be undone. All your data, messages, and settings will be permanently removed from our servers.
              </p>
              <Button
                variant="destructive"
                onClick={() => setShowDeletionForm(true)}
                iconName="Trash2"
                iconPosition="left"
              >
                Continue with Deletion
              </Button>
            </div>
          </div>
        </div>
        {/* What Gets Deleted */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">
            What happens when you delete your account
          </h3>
          <div className="space-y-4">
            {deletionConsequences?.map((item, index) => (
              <div key={index} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-error/20 rounded-full flex items-center justify-center">
                    <AppIcon name={item?.icon} size={16} className="text-error" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-1">
                      {item?.title}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {item?.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Alternatives */}
        <div className="bg-muted/50 border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Consider these alternatives
          </h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <AppIcon name="Settings" size={16} className="text-primary" />
              <span className="text-sm text-foreground">
                Adjust your notification settings to reduce interruptions
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <AppIcon name="EyeOff" size={16} className="text-primary" />
              <span className="text-sm text-foreground">
                Update privacy settings to control who can contact you
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <AppIcon name="Pause" size={16} className="text-primary" />
              <span className="text-sm text-foreground">
                Take a break by logging out instead of deleting your account
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => setShowDeletionForm(false)}
        iconName="ArrowLeft"
        iconPosition="left"
        className="mb-4"
      >
        Back to Account Settings
      </Button>
      {/* Final Warning */}
      <div className="bg-error/10 border border-error/20 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <AppIcon name="AlertTriangle" size={24} className="text-error flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-error mb-2">
              Final Warning
            </h3>
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. Your account and all associated data will be permanently deleted.
            </p>
          </div>
        </div>
      </div>
      {/* Deletion Form */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-6">
          Confirm Account Deletion
        </h3>
        
        <div className="space-y-6">
          {/* Reason for deletion */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Why are you deleting your account? (Optional)
            </label>
            <div className="space-y-2">
              {reasonOptions?.map((reason) => (
                <label key={reason} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="reason"
                    value={reason}
                    checked={deletionData?.reason === reason}
                    onChange={(e) => handleInputChange('reason', e?.target?.value)}
                    className="w-4 h-4 text-primary border-border focus:ring-primary"
                  />
                  <span className="text-sm text-foreground">{reason}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Data export option */}
          <div className="bg-muted/50 rounded-lg p-4">
            <Checkbox
              label="Export my data before deletion"
              description="Download a copy of your account data before it's deleted"
              checked={deletionData?.dataExport}
              onChange={(e) => handleInputChange('dataExport', e?.target?.checked)}
            />
          </div>

          {/* Password confirmation */}
          <Input
            label="Enter your password to confirm"
            type="password"
            value={deletionData?.password}
            onChange={(e) => handleInputChange('password', e?.target?.value)}
            error={errors?.password}
            required
          />

          {/* Confirmation text */}
          <Input
            label="Type 'DELETE MY ACCOUNT' to confirm"
            type="text"
            value={deletionData?.confirmText}
            onChange={(e) => handleInputChange('confirmText', e?.target?.value)}
            error={errors?.confirmText}
            description="This text must match exactly (case sensitive)"
            required
          />

          {/* Understanding checkbox */}
          <Checkbox
            label="I understand that this action cannot be undone"
            description="By checking this box, you acknowledge that your account and all data will be permanently deleted"
            checked={deletionData?.understanding}
            onChange={(e) => handleInputChange('understanding', e?.target?.checked)}
            error={errors?.understanding}
            required
          />

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 pt-6 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setShowDeletionForm(false)}
              className="sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              loading={isDeleting}
              iconName="Trash2"
              iconPosition="left"
              className="sm:w-auto"
            >
              {isDeleting ? 'Deleting Account...' : 'Delete My Account'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountDeletion;
