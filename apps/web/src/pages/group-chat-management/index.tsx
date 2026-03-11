// web/src/pages/group-chat-management/index.tsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import type { ComponentProps } from "react";
import type { AppDispatch, RootState } from "redux/store";
import { fetchRooms } from "redux/slices/chatSlice";
import Header from "../../components/ui/Header";
import AppIcon from "../../components/AppIcon";
import Button from "../../components/ui/Button";
import GroupInfoCard from "./components/GroupInfoCard";
import ParticipantsList from "./components/ParticipantsList";
import GroupSettings from "./components/GroupSettings";
import MediaGallery from "./components/MediaGallery";
import ModerationTools from "./components/ModerationTools";

// ─── Local UI Types ───────────────────────────────────────────────────────────

type IconName = ComponentProps<typeof AppIcon>["name"];
type TabKey = "info" | "participants" | "settings" | "media" | "moderation";

interface Tab {
  key: TabKey;
  label: string;
  icon: IconName;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TABS: Tab[] = [
  { key: "info",         label: "Group Info",   icon: "Info"     },
  { key: "participants", label: "Participants", icon: "Users"    },
  { key: "settings",    label: "Settings",     icon: "Settings" },
  { key: "media",       label: "Media",        icon: "Image"    },
  { key: "moderation",  label: "Moderation",   icon: "Shield"   },
];

// ─── Component ───────────────────────────────────────────────────────────────

const GroupChatManagement = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const [activeTab, setActiveTab] = useState<TabKey>("info");

  const activeRoomId = useSelector(
    (state: RootState) => state.chat.activeRoomId
  );
  const isLoading = useSelector(
    (state: RootState) => state.chat.isLoading
  );
  const rooms = useSelector(
    (state: RootState) => state.chat.rooms ?? []
  );

  // Fetch rooms if not yet loaded
  useEffect(() => {
    if (rooms.length === 0) {
      dispatch(fetchRooms());
    }
  }, [dispatch, rooms.length]);

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-16 flex items-center justify-center min-h-screen">
          <div className="flex items-center space-x-2">
            <AppIcon
              name="Loader2"
              size={24}
              className="text-primary animate-spin"
            />
            <span className="text-foreground">Loading group details...</span>
          </div>
        </div>
      </div>
    );
  }

  // ── No active room ──
  if (!activeRoomId) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-16 flex flex-col items-center justify-center min-h-screen space-y-4">
          <AppIcon name="Users" size={48} className="text-muted-foreground" />
          <p className="text-muted-foreground">No group selected.</p>
          <Button
            variant="default"
            onClick={() => navigate("/chat-dashboard")}
            iconName="ArrowLeft"
            iconPosition="left"
          >
            Back to Chat
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 py-6">

          {/* ── Page Header ── */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/chat-dashboard")}
                iconName="ArrowLeft"
              />
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Group Management
                </h1>
                <p className="text-muted-foreground">
                  Manage participants, settings, and content for your group
                </p>
              </div>
            </div>
            <Button
              variant="default"
              onClick={() => navigate("/chat-dashboard")}
              iconName="MessageCircle"
              iconPosition="left"
            >
              Back to Chat
            </Button>
          </div>

          {/* ── Tab Navigation ── */}
          <div className="border-b border-border mb-6">
            <nav className="flex space-x-8 overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors duration-200 ${
                    activeTab === tab.key
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                  }`}
                >
                  <AppIcon name={tab.icon} size={16} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* ── Tab Content ── */}
          {/* Each child handles its own data fetching and mutations via Redux */}
          <div className="space-y-6">
            {activeTab === "info"         && <GroupInfoCard    roomId={activeRoomId} />}
            {activeTab === "participants" && <ParticipantsList roomId={activeRoomId} />}
            {activeTab === "settings"    && <GroupSettings    roomId={activeRoomId} />}
            {activeTab === "media"       && <MediaGallery     roomId={activeRoomId} />}
            {activeTab === "moderation"  && <ModerationTools  roomId={activeRoomId} />}
          </div>

        </div>
      </div>
    </div>
  );
};

export default GroupChatManagement;