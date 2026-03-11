import React, { useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { useNavigate } from "react-router-dom";
import * as LucideIcons from "lucide-react";
import { format } from "date-fns";
import type { ComponentProps } from "react";
import type { AppDispatch, RootState } from "redux/store";
import AppIcon from "components/AppIcon";
import Button from "components/ui/Button";
import Input from "components/ui/Input";
import { chatService } from "services/chat.service";
import { fetchRooms, setActiveRoom } from "redux/slices/chatSlice";

// ─── Types ───────────────────────────────────────────────────────────────────

type IconName = keyof typeof LucideIcons;
type ButtonVariant = ComponentProps<typeof Button>["variant"];

interface ModerationAction {
    title: string;
    description: string;
    icon: IconName;
    onAction: () => void;
    variant: ButtonVariant;
    available: boolean;
}

interface StatItem {
    label: string;
    value: string | number;
    icon: IconName;
}

interface ModerationToolsProps {
    roomId: string;
}

// ─── Thunks ──────────────────────────────────────────────────────────────────

const archiveRoom = createAsyncThunk(
    "chat/archiveRoom",
    async (roomId: string, { rejectWithValue, dispatch }) => {
        try {
            const result = await chatService.archiveRoom(roomId);
            dispatch(fetchRooms());
            return result;
        } catch (err) {
            return rejectWithValue(
                err instanceof Error ? err.message : "Failed to archive group"
            );
        }
    }
);

const deleteRoom = createAsyncThunk(
    "chat/deleteRoom",
    async (roomId: string, { rejectWithValue, dispatch }) => {
        try {
            await chatService.deleteRoom(roomId);
            dispatch(setActiveRoom(null));
            dispatch(fetchRooms());
        } catch (err) {
            return rejectWithValue(
                err instanceof Error ? err.message : "Failed to delete group"
            );
        }
    }
);

const exportChat = createAsyncThunk(
    "chat/exportChat",
    async (roomId: string, { rejectWithValue }) => {
        try {
            return await chatService.exportChat(roomId);
        } catch (err) {
            return rejectWithValue(
                err instanceof Error ? err.message : "Failed to export chat"
            );
        }
    }
);

// ─── Component ───────────────────────────────────────────────────────────────

const ModerationTools = ({ roomId }: ModerationToolsProps) => {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();

    const group = useSelector((state: RootState) =>
        state.chat.rooms.find((r) => r._id === roomId)
    );
    const currentUser = useSelector((state: RootState) => state.auth.user);

    // Permission checks — all use _id per shared User type
    const isAdmin = group?.admins?.some(
        (admin) => admin._id === currentUser?._id
    ) ?? false;

    const isModerator = group?.moderators?.some(
        (mod) => mod._id === currentUser?._id
    ) ?? false;

    const canModerate = isAdmin || isModerator;

    // Modal state
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState<string>("");

    // Action feedback
    const [actionError, setActionError] = useState<string | null>(null);
    const [loadingAction, setLoadingAction] = useState<"archive" | "delete" | "export" | null>(null);

    // ── Handlers ──

    const handleArchive = useCallback(async () => {
        setLoadingAction("archive");
        setActionError(null);
        const result = await dispatch(archiveRoom(roomId));
        setLoadingAction(null);

        if (archiveRoom.fulfilled.match(result)) {
            setShowArchiveConfirm(false);
            navigate("/chat-dashboard");
        } else {
            setActionError((result.payload as string) ?? "Failed to archive group.");
        }
    }, [roomId, dispatch, navigate]);

    const handleDelete = useCallback(async () => {
        if (deleteConfirmText !== group?.name) return;

        setLoadingAction("delete");
        setActionError(null);
        const result = await dispatch(deleteRoom(roomId));
        setLoadingAction(null);

        if (deleteRoom.fulfilled.match(result)) {
            setShowDeleteConfirm(false);
            setDeleteConfirmText("");
            navigate("/chat-dashboard");
        } else {
            setActionError((result.payload as string) ?? "Failed to delete group.");
        }
    }, [deleteConfirmText, group?.name, roomId, dispatch, navigate]);

    const handleExport = useCallback(async () => {
        setLoadingAction("export");
        setActionError(null);
        const result = await dispatch(exportChat(roomId));
        setLoadingAction(null);

        if (exportChat.fulfilled.match(result)) {
            // Open the export download URL
            window.open(result.payload.url, "_blank", "noopener,noreferrer");
        } else {
            setActionError((result.payload as string) ?? "Failed to export chat.");
        }
    }, [roomId, dispatch]);

    // ── Stats — typed against actual Room fields ──
    const activeMembers = group?.participants?.filter((p) => p.isOnline).length ?? 0;

    const groupStats: StatItem[] = [
        {
            label: "Total Messages",
            value: group?.messageCount ?? 0,
            icon: "MessageCircle",
        },
        {
            label: "Media Files",
            value: group?.mediaCount ?? 0,
            icon: "Image",
        },
        {
            label: "Active Members",
            value: activeMembers,
            icon: "Users",
        },
        {
            label: "Created",
            value: group?.createdAt
                ? format(new Date(group.createdAt), "MMM d, yyyy")
                : "—",
            icon: "Calendar",
        },
    ];

    // ── Actions config ──
    const moderationActions: ModerationAction[] = [
        {
            title: "Export Chat History",
            description: "Download all messages and media from this group",
            icon: "Download",
            onAction: handleExport,
            variant: "outline",
            available: canModerate,
        },
        {
            title: "Archive Group",
            description: "Hide this group from active conversations",
            icon: "Archive",
            onAction: () => setShowArchiveConfirm(true),
            variant: "outline",
            available: isAdmin,
        },
        {
            title: "Delete Group",
            description: "Permanently delete this group and all messages",
            icon: "Trash2",
            onAction: () => setShowDeleteConfirm(true),
            variant: "destructive",
            available: isAdmin,
        },
    ];

    // ── Guard ──
    if (!group) {
        return (
            <div className="bg-card border border-border rounded-lg p-6">
                <p className="text-sm text-muted-foreground">Group not found.</p>
            </div>
        );
    }

    return (
        <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-6">
                Moderation Tools
            </h3>

            {/* ── Error banner ── */}
            {actionError && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center space-x-2">
                    <AppIcon name="AlertCircle" size={15} className="text-destructive" />
                    <p className="text-sm text-destructive">{actionError}</p>
                </div>
            )}

            {/* ── Stats ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {groupStats.map((stat) => (
                    <div key={stat.label} className="bg-secondary/50 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                            <AppIcon name={stat.icon} size={16} className="text-primary" />
                            <span className="text-xs text-muted-foreground">{stat.label}</span>
                        </div>
                        <p className="text-lg font-semibold text-foreground">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* ── Actions ── */}
            <div className="space-y-4">
                {moderationActions
                    .filter((action) => action.available)
                    .map((action) => (
                        <div
                            key={action.title}
                            className="flex items-center justify-between p-4 border border-border rounded-lg"
                        >
                            <div className="flex items-center space-x-3">
                                <div
                                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.variant === "destructive"
                                            ? "bg-destructive/10"
                                            : "bg-secondary"
                                        }`}
                                >
                                    <AppIcon
                                        name={action.icon}
                                        size={18}
                                        className={
                                            action.variant === "destructive"
                                                ? "text-destructive"
                                                : "text-muted-foreground"
                                        }
                                    />
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-foreground">
                                        {action.title}
                                    </h4>
                                    <p className="text-xs text-muted-foreground">
                                        {action.description}
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant={action.variant}
                                size="sm"
                                onClick={action.onAction}
                                iconName={action.icon}
                                iconPosition="left"
                                disabled={loadingAction !== null}
                            >
                                {action.title.split(" ")[0]}
                            </Button>
                        </div>
                    ))}
            </div>

            {/* ── Non-moderator notice ── */}
            {!canModerate && (
                <div className="mt-6 p-4 bg-muted/20 rounded-lg border border-border">
                    <div className="flex items-center space-x-2">
                        <AppIcon name="Shield" size={16} className="text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                            You need administrator or moderator permissions to access these
                            tools.
                        </p>
                    </div>
                </div>
            )}

            {/* ── Archive Confirm Modal ── */}
            {showArchiveConfirm && (
                <div
                    className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
                    onClick={() => setShowArchiveConfirm(false)}
                >
                    <div
                        className="bg-card border border-border rounded-lg p-6 max-w-md w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                                <AppIcon name="Archive" size={20} className="text-warning" />
                            </div>
                            <div>
                                <h4 className="text-lg font-semibold text-foreground">
                                    Archive Group
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    This action can be undone later
                                </p>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-6">
                            Are you sure you want to archive "{group.name}"? The group will be
                            hidden from active conversations but can be restored later.
                        </p>
                        <div className="flex space-x-3">
                            <Button
                                variant="outline"
                                onClick={() => setShowArchiveConfirm(false)}
                                className="flex-1"
                                disabled={loadingAction === "archive"}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleArchive}
                                className="flex-1 border-warning text-warning hover:bg-warning/10"
                                iconName="Archive"
                                iconPosition="left"
                                disabled={loadingAction === "archive"}
                            >
                                {loadingAction === "archive" ? "Archiving..." : "Archive Group"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Confirm Modal ── */}
            {showDeleteConfirm && (
                <div
                    className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
                    onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmText("");
                    }}
                >
                    <div
                        className="bg-card border border-border rounded-lg p-6 max-w-md w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center space-x-3 mb-4">
                            <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
                                <AppIcon
                                    name="AlertTriangle"
                                    size={20}
                                    className="text-destructive"
                                />
                            </div>
                            <div>
                                <h4 className="text-lg font-semibold text-foreground">
                                    Delete Group
                                </h4>
                                <p className="text-sm text-destructive">
                                    This action cannot be undone
                                </p>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                            This will permanently delete "{group.name}" and all its messages,
                            media, and history. All participants will lose access immediately.
                        </p>
                        <Input
                            label={`Type "${group.name}" to confirm deletion`}
                            type="text"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder={group.name}
                            className="mb-6"
                        />
                        <div className="flex space-x-3">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setDeleteConfirmText("");
                                }}
                                className="flex-1"
                                disabled={loadingAction === "delete"}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={
                                    deleteConfirmText !== group.name ||
                                    loadingAction === "delete"
                                }
                                className="flex-1"
                                iconName="Trash2"
                                iconPosition="left"
                            >
                                {loadingAction === "delete" ? "Deleting..." : "Delete Forever"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ModerationTools;