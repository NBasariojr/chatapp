import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createAsyncThunk } from "@reduxjs/toolkit";
import type { AppDispatch, RootState } from "redux/store";
import type { RoomSettings } from "@chatapp/shared";
import Icon from "components/AppIcon";
import Button from "components/ui/Button";
import { Checkbox } from "components/ui/Checkbox";
import { chatService } from "services/chat.service";
import { fetchRooms } from "redux/slices/chatSlice";

interface SettingConfig {
  key: keyof RoomSettings;
  label: string;
  description: string;
  icon: string;
}

interface GroupSettingsProps {
  roomId: string;
}

// ─── Settings Config (stable, defined outside component) ─────────────────────

const SETTINGS_CONFIG: SettingConfig[] = [
  {
    key: "allowMemberInvites",
    label: "Allow members to invite others",
    description: "Members can add new participants to the group",
    icon: "UserPlus",
  },
  {
    key: "allowMediaSharing",
    label: "Allow media sharing",
    description: "Members can share images, videos, and files",
    icon: "Image",
  },
  {
    key: "allowMessageEditing",
    label: "Allow message editing",
    description: "Members can edit their messages after sending",
    icon: "Edit",
  },
  {
    key: "allowMessageDeletion",
    label: "Allow message deletion",
    description: "Members can delete their own messages",
    icon: "Trash2",
  },
  {
    key: "enableReadReceipts",
    label: "Enable read receipts",
    description: "Show when messages have been read",
    icon: "Eye",
  },
  {
    key: "enableTypingIndicators",
    label: "Enable typing indicators",
    description: "Show when someone is typing",
    icon: "MessageCircle",
  },
  {
    key: "muteNotifications",
    label: "Mute notifications",
    description: "Disable push notifications for this group",
    icon: "BellOff",
  },
  {
    key: "archiveOldMessages",
    label: "Auto-archive old messages",
    description: "Automatically archive messages older than 30 days",
    icon: "Archive",
  },
];

// ─── Async Thunk ─────────────────────────────────────────────────────────────

export const updateRoomSettings = createAsyncThunk(
  "chat/updateRoomSettings",
  async (
    { roomId, settings }: { roomId: string; settings: Partial<RoomSettings> },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const updated = await chatService.updateRoomSettings(roomId, settings);
      dispatch(fetchRooms());
      return updated;
    } catch (err) {
      return rejectWithValue(
        err instanceof Error ? err.message : "Failed to save settings"
      );
    }
  }
);

// ─── Component ───────────────────────────────────────────────────────────────

const GroupSettings = ({ roomId }: GroupSettingsProps) => {
  const dispatch = useDispatch<AppDispatch>();

  const group = useSelector((state: RootState) =>
    state.chat.rooms.find((r) => r._id === roomId)
  );

  const currentUser = useSelector((state: RootState) => state.auth.user);

  const isAdmin =
    group?.admins?.some((admin) => admin._id === currentUser?._id) ?? false;

  // Mirror Redux settings into local state so changes feel instant
  const [localSettings, setLocalSettings] = useState<RoomSettings>(
    (group?.settings as RoomSettings) ?? ({} as RoomSettings)
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync local state if Redux room updates externally (e.g. socket event)
  useEffect(() => {
    if (group?.settings) {
      setLocalSettings(group.settings as RoomSettings);
      setHasChanges(false);
    }
  }, [group?.settings]);

  const handleSettingChange = (key: keyof RoomSettings, value: boolean) => {
    const updated = { ...localSettings, [key]: value };
    setLocalSettings(updated);
    setHasChanges(
      JSON.stringify(updated) !== JSON.stringify(group?.settings ?? {})
    );
    setSaveError(null);
  };

  const handleReset = () => {
    setLocalSettings((group?.settings as RoomSettings) ?? ({} as RoomSettings));
    setHasChanges(false);
    setSaveError(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);

    const result = await dispatch(
      updateRoomSettings({ roomId, settings: localSettings })
    );

    setIsSaving(false);

    if (updateRoomSettings.fulfilled.match(result)) {
      setHasChanges(false);
    } else {
      setSaveError((result.payload as string) ?? "Something went wrong.");
    }
  };

  // Guard: room not found
  if (!group) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <p className="text-sm text-muted-foreground">Group not found.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Group Settings</h3>

        {hasChanges && isAdmin && (
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isSaving}
            >
              Reset
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              iconName={isSaving ? undefined : "Save"}
              iconPosition="left"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </div>

      {/* ── Error Banner ── */}
      {saveError && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <Icon name="AlertCircle" size={15} className="text-destructive" />
            <p className="text-sm text-destructive">{saveError}</p>
          </div>
        </div>
      )}

      {/* ── Settings List ── */}
      <div className="space-y-6">
        {SETTINGS_CONFIG.map((setting) => (
          <div key={setting.key} className="flex items-start space-x-4">
            <div className="flex-shrink-0 w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
              <Icon
                name={setting.icon}
                size={18}
                className="text-muted-foreground"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-foreground">
                    {setting.label}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {setting.description}
                  </p>
                </div>
                <Checkbox
                  checked={localSettings[setting.key] ?? false}
                  onChange={(e) =>
                    handleSettingChange(setting.key, e.target.checked)
                  }
                  disabled={!isAdmin || isSaving}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Non-admin Notice ── */}
      {!isAdmin && (
        <div className="mt-6 p-4 bg-muted/20 rounded-lg border border-border">
          <div className="flex items-center space-x-2">
            <Icon name="Info" size={16} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Only group administrators can modify these settings.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupSettings;