import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../../redux/store";
import { createAsyncThunk } from "@reduxjs/toolkit";
import Icon from "components/AppIcon";
import Image from "components/AppImage";
import Button from "components/ui/Button";
import Input from "components/ui/Input";
import { chatService } from "services/chat.service";
import { fetchRooms } from "../../../redux/slices/chatSlice";
import type { User } from "@chatapp/shared";

// ─── Types ───────────────────────────────────────────────────────────────────

interface GroupInfoCardProps {
  roomId: string;
}

interface EditableGroupFields {
  name: string;
  description: string;
}

// ─── Async Thunk ─────────────────────────────────────────────────────────────

export const updateRoom = createAsyncThunk(
  "chat/updateRoom",
  async (
    { roomId, data }: { roomId: string; data: Partial<EditableGroupFields> },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const updated = await chatService.updateRoom(roomId, data);
      // Refresh rooms list so UI reflects the update
      dispatch(fetchRooms());
      return updated;
    } catch (err) {
      return rejectWithValue(
        err instanceof Error ? err.message : "Failed to update group"
      );
    }
  }
);

// ─── Component ───────────────────────────────────────────────────────────────

const GroupInfoCard = ({ roomId }: GroupInfoCardProps) => {
  const dispatch = useDispatch<AppDispatch>();

  // Pull group from rooms list by roomId
  const group = useSelector((state: RootState) =>
    state.chat.rooms.find((r) => r._id === roomId)
  );

  // Current logged-in user
  const currentUser = useSelector((state: RootState) => state.auth.user) as User | null;

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [editedGroup, setEditedGroup] = useState<EditableGroupFields>({
    name: group?.name ?? "",
    description: group?.description ?? "",
  });

  // Check if the current user is an admin of this group
  const isAdmin = group?.admins?.some(
    (admin) => admin._id === currentUser?._id
  ) ?? false;

  const handleEdit = () => {
    // Reset form to current values when opening edit mode
    setEditedGroup({
      name: group?.name ?? "",
      description: group?.description ?? "",
    });
    setSaveError(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedGroup({
      name: group?.name ?? "",
      description: group?.description ?? "",
    });
    setSaveError(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!editedGroup.name.trim()) {
      setSaveError("Group name is required.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const result = await dispatch(
      updateRoom({ roomId, data: editedGroup })
    );

    setIsSaving(false);

    if (updateRoom.fulfilled.match(result)) {
      setIsEditing(false);
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
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center overflow-hidden">
            {group.avatar ? (
              <Image
                src={group.avatar}
                alt={group.name || "Group avatar"}
                className="w-full h-full object-cover"
              />
            ) : (
              <Icon name="Users" size={24} className="text-muted-foreground" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {group.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              {group.participants?.length ?? 0} members • Created{" "}
              {group.createdAt}
            </p>
          </div>
        </div>

        {isAdmin && !isEditing && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleEdit}
            iconName="Edit"
            iconPosition="left"
          >
            Edit
          </Button>
        )}
      </div>

      {/* ── Edit Mode ── */}
      {isEditing ? (
        <div className="space-y-4">
          <Input
            label="Group Name"
            type="text"
            value={editedGroup.name}
            onChange={(e) =>
              setEditedGroup((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Enter group name"
            required
          />
          <Input
            label="Description"
            type="text"
            value={editedGroup.description}
            onChange={(e) =>
              setEditedGroup((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
            placeholder="Enter group description"
          />

          {/* Inline error */}
          {saveError && (
            <p className="text-sm text-destructive">{saveError}</p>
          )}

          <div className="flex space-x-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              iconName={isSaving ? undefined : "Check"}
              iconPosition="left"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        /* ── View Mode ── */
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-medium text-foreground mb-1">
              Description
            </h3>
            <p className="text-sm text-muted-foreground">
              {group.description || "No description provided"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground">Created by</p>
              <p className="text-sm font-medium text-foreground">
                {group.createdBy}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Privacy</p>
              <div className="flex items-center space-x-1">
                <Icon
                  name={group.isPrivate ? "Lock" : "Globe"}
                  size={14}
                  className="text-muted-foreground"
                />
                <p className="text-sm font-medium text-foreground">
                  {group.isPrivate ? "Private" : "Public"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupInfoCard;