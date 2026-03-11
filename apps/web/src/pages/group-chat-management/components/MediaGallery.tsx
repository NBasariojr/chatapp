// web/src/pages/group-chat-management/components/MediaGallery.tsx

import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { format } from "date-fns";
import * as LucideIcons from "lucide-react";
import type { AppDispatch, RootState } from "redux/store";
import type { Media } from "@chatapp/shared";
import Icon from "../../../components/AppIcon";
import Image from "../../../components/AppImage";
import Button from "../../../components/ui/Button";
import { chatService } from "services/chat.service";

// ─── Types ───────────────────────────────────────────────────────────────────

// Shared Media type uses 'image' | 'video' | 'file'
type FilterKey = "all" | "image" | "video" | "file";
type IconName = keyof typeof LucideIcons;

interface FilterOption {
  key: FilterKey;
  label: string;
  icon: IconName;
}

interface MediaGalleryProps {
  roomId: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const FILTER_OPTIONS: FilterOption[] = [
  { key: "all",   label: "All Media",  icon: "Grid3X3"  },
  { key: "image", label: "Images",     icon: "Image"    },
  { key: "video", label: "Videos",     icon: "Video"    },
  { key: "file",  label: "Documents",  icon: "FileText" },
];

const FILE_ICONS: Record<Media["type"] | "default", IconName> = {
  image:   "Image",
  video:   "Video",
  file:    "FileText",
  default: "File",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getFileIcon = (type: Media["type"]): IconName =>
  FILE_ICONS[type] ?? FILE_ICONS.default;

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"] as const;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// ─── Thunks ──────────────────────────────────────────────────────────────────

const fetchRoomMedia = createAsyncThunk(
  "chat/fetchRoomMedia",
  async (roomId: string, { rejectWithValue }) => {
    try {
      return await chatService.getRoomMedia(roomId);
    } catch (err) {
      return rejectWithValue(
        err instanceof Error ? err.message : "Failed to load media"
      );
    }
  }
);

const deleteMedia = createAsyncThunk(
  "chat/deleteMedia",
  async (
    { roomId, mediaId }: { roomId: string; mediaId: string },
    { rejectWithValue, dispatch }
  ) => {
    try {
      await chatService.deleteMedia(mediaId);
      // Refresh media list after deletion
      dispatch(fetchRoomMedia(roomId));
      return mediaId;
    } catch (err) {
      return rejectWithValue(
        err instanceof Error ? err.message : "Failed to delete media"
      );
    }
  }
);

// ─── Component ───────────────────────────────────────────────────────────────

const MediaGallery = ({ roomId }: MediaGalleryProps) => {
  const dispatch = useDispatch<AppDispatch>();

  const currentUser = useSelector((state: RootState) => state.auth.user);
  const group = useSelector((state: RootState) =>
    state.chat.rooms.find((r) => r._id === roomId)
  );

  const isAdmin =
    group?.admins?.some((admin) => admin._id === currentUser?._id) ?? false;

  // Media lives in local state — it's gallery-specific, not needed in chatSlice
  const [mediaFiles, setMediaFiles]     = useState<Media[]>([]);
  const [isLoading, setIsLoading]       = useState(false);
  const [loadError, setLoadError]       = useState<string | null>(null);
  const [deleteError, setDeleteError]   = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterKey>("all");
  const [selectedMedia, setSelectedMedia]   = useState<Media | null>(null);

  // ── Fetch on mount ──
  useEffect(() => {
    const loadMedia = async () => {
      setIsLoading(true);
      setLoadError(null);
      const result = await dispatch(fetchRoomMedia(roomId));
      if (fetchRoomMedia.fulfilled.match(result)) {
        setMediaFiles(result.payload);
      } else {
        setLoadError((result.payload as string) ?? "Failed to load media");
      }
      setIsLoading(false);
    };

    loadMedia();
  }, [roomId, dispatch]);

  // ── Filter ──
  const filteredMedia = mediaFiles.filter((file) =>
    selectedFilter === "all" ? true : file.type === selectedFilter
  );

  // ── Handlers ──
  const handleDownload = useCallback((media: Media) => {
    // Open the media URL in a new tab — no API call needed
    window.open(media.url, "_blank", "noopener,noreferrer");
  }, []);

  const handleDelete = useCallback(
    async (mediaId: string) => {
      setDeleteError(null);
      const result = await dispatch(deleteMedia({ roomId, mediaId }));

      if (deleteMedia.fulfilled.match(result)) {
        setMediaFiles((prev) => prev.filter((m) => m._id !== mediaId));
        // Close modal if the deleted item was open
        setSelectedMedia((prev) => (prev?._id === mediaId ? null : prev));
      } else {
        setDeleteError((result.payload as string) ?? "Failed to delete.");
      }
    },
    [roomId, dispatch]
  );

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-center py-12">
          <Icon name="Loader2" size={32} className="text-muted-foreground animate-spin" />
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (loadError) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center space-x-2 text-destructive">
          <Icon name="AlertCircle" size={16} />
          <p className="text-sm">{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">
          Media Gallery ({filteredMedia.length})
        </h3>
        <div className="flex items-center space-x-2">
          {FILTER_OPTIONS.map((option) => (
            <Button
              key={option.key}
              variant={selectedFilter === option.key ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFilter(option.key)}
              iconName={option.icon}
              iconPosition="left"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Delete error banner ── */}
      {deleteError && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center space-x-2">
          <Icon name="AlertCircle" size={15} className="text-destructive" />
          <p className="text-sm text-destructive">{deleteError}</p>
        </div>
      )}

      {/* ── Empty state ── */}
      {filteredMedia.length === 0 ? (
        <div className="text-center py-12">
          <Icon name="ImageOff" size={48} className="text-muted-foreground mx-auto mb-4" />
          <h4 className="text-lg font-medium text-foreground mb-2">No media files</h4>
          <p className="text-muted-foreground">
            {selectedFilter === "all"
              ? "No media has been shared in this group yet."
              : `No ${selectedFilter}s have been shared in this group yet.`}
          </p>
        </div>
      ) : (
        /* ── Grid ── */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMedia.map((media) => (
            <div
              key={media._id}
              className="relative group cursor-pointer"
              onClick={() => setSelectedMedia(media)}
            >
              <div className="aspect-square bg-secondary rounded-lg overflow-hidden">
                {media.type === "image" ? (
                  <Image
                    src={media.url}
                    alt={media.filename}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Icon
                      name={getFileIcon(media.type)}
                      size={32}
                      className="text-muted-foreground"
                    />
                  </div>
                )}
              </div>

              {/* ── Hover overlay ── */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center">
                <div className="flex space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(media);
                    }}
                    iconName="Download"
                  />
                  {(isAdmin || media.uploadedBy === currentUser?._id) && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(media._id);
                      }}
                      iconName="Trash2"
                    />
                  )}
                </div>
              </div>

              <div className="mt-2">
                <p className="text-xs font-medium text-foreground truncate">
                  {media.filename}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{formatFileSize(media.size)}</span>
                  <span>{format(new Date(media.createdAt), "MMM d, yyyy")}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Preview Modal ── */}
      {selectedMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedMedia(null)}
        >
          <div
            className="relative max-w-4xl max-h-full bg-card rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()} // prevent close on inner click
          >
            <div className="absolute top-4 right-4 z-10">
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setSelectedMedia(null)}
                iconName="X"
              />
            </div>

            <div className="p-6">
              {selectedMedia.type === "image" ? (
                <Image
                  src={selectedMedia.url}
                  alt={selectedMedia.filename}
                  className="max-w-full max-h-96 object-contain mx-auto"
                />
              ) : selectedMedia.type === "video" ? (
                <video
                  src={selectedMedia.url}
                  controls
                  className="max-w-full max-h-96 mx-auto"
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="text-center py-12">
                  <Icon
                    name={getFileIcon(selectedMedia.type)}
                    size={64}
                    className="text-muted-foreground mx-auto mb-4"
                  />
                  <h4 className="text-lg font-medium text-foreground mb-2">
                    {selectedMedia.filename}
                  </h4>
                  <p className="text-muted-foreground mb-4">
                    {formatFileSize(selectedMedia.size)}
                  </p>
                  <Button
                    variant="default"
                    onClick={() => handleDownload(selectedMedia)}
                    iconName="Download"
                    iconPosition="left"
                  >
                    Download File
                  </Button>
                </div>
              )}

              {/* ── Modal footer ── */}
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {selectedMedia.filename}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(selectedMedia.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(selectedMedia)}
                      iconName="Download"
                      iconPosition="left"
                    >
                      Download
                    </Button>
                    {(isAdmin || selectedMedia.uploadedBy === currentUser?._id) && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(selectedMedia._id)}
                        iconName="Trash2"
                        iconPosition="left"
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaGallery;