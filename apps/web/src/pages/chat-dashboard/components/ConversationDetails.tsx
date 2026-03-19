import React, { useState, useEffect } from "react"; // ← useEffect added
import Icon from "../../../components/AppIcon";
import AppImage from "../../../components/AppImage";
import Button from "../../../components/ui/Button";
import ProfileView from "./ProfileView";
import ThemeModal, { DEFAULT_THEMES, type Theme } from "./ThemeModal";

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  status?: "online" | "away" | "busy" | "offline";
  role?: string;
}

interface Conversation {
  id: string;
  type: "direct" | "group";
  name: string;
  avatar?: string;
  participants: Participant[];
}

interface ConversationDetailsProps {
  conversation: Conversation | null;
  onClose: () => void;
  currentUser: Participant;
  onBack?: () => void;
  className?: string;
  onThemeChange?: (theme: Theme) => void;
  activeThemeId?: string;
}

const sharedMedia = [
  {
    id: 1,
    type: "image",
    url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=200&fit=crop",
    timestamp: new Date(Date.now() - 86400000),
  },
  {
    id: 2,
    type: "image",
    url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=300&h=200&fit=crop",
    timestamp: new Date(Date.now() - 172800000),
  },
  {
    id: 3,
    type: "file",
    name: "Project_Proposal.pdf",
    size: "2.4 MB",
    timestamp: new Date(Date.now() - 259200000),
  },
  {
    id: 4,
    type: "image",
    url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=300&h=200&fit=crop",
    timestamp: new Date(Date.now() - 345600000),
  },
];

const tabs = [
  { id: "members", label: "Members", icon: "Users" },
  { id: "media",   label: "Media",   icon: "Image" },
  { id: "files",   label: "Files",   icon: "File"  },
];

const ConversationDetails = ({
  conversation,
  onClose,
  currentUser,
  onBack,
  className,
  onThemeChange,
  activeThemeId,
}: ConversationDetailsProps) => {
  const [activeTab, setActiveTab] = useState("members");

  // Theme state
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [selectedTheme, setSelectedTheme]   = useState<Theme>(
    () =>
      DEFAULT_THEMES.find((t) => t.id === activeThemeId) ?? DEFAULT_THEMES[0],
  );

  // ── Fix 3: re-sync selectedTheme when the parent switches rooms ──────────
  // Without this, opening Details on Room A, then switching to Room B while
  // the panel stays open would still show Room A's theme name on the button.
  useEffect(() => {
    const match =
      DEFAULT_THEMES.find((t) => t.id === activeThemeId) ?? DEFAULT_THEMES[0];
    setSelectedTheme(match);
  }, [activeThemeId]);
  // ─────────────────────────────────────────────────────────────────────────

  const handleThemeSelect = (theme: Theme) => {
    setSelectedTheme(theme);
    onThemeChange?.(theme);
  };

  if (!conversation) return null;

  const onlineCount = conversation.participants.filter(
    (p) => p.status === "online",
  ).length;

  return (
    <>
      <div
        className={`bg-card border-l border-border flex flex-col h-full ${
          className ?? "w-80"
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              {onBack && (
                <Button variant="ghost" size="icon" onClick={onBack}>
                  <Icon name="ArrowLeft" size={20} />
                </Button>
              )}
              <h3 className="text-lg font-semibold text-foreground">Details</h3>
            </div>
            {!onBack && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <Icon name="X" size={20} />
              </Button>
            )}
          </div>

          <div className="text-center">
            {conversation.type === "direct" ? (
              (() => {
                const otherPerson =
                  conversation.participants.find(
                    (p) => p.id !== currentUser.id,
                  ) ?? conversation.participants[0];
                if (!otherPerson) return null;
                return (
                  <ProfileView
                    user={{
                      ...otherPerson,
                      name: conversation.name,
                      avatar: conversation.avatar,
                    }}
                    showFullName={true}
                    showStatus={true}
                    showLastSeen={true}
                    size="xl"
                    currentUser={currentUser}
                  />
                );
              })()
            ) : (
              <div>
                <div className="w-20 h-20 rounded-full overflow-hidden bg-secondary mx-auto mb-3 flex items-center justify-center">
                  {conversation.avatar ? (
                    <AppImage
                      src={conversation.avatar}
                      alt={conversation.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Icon
                      name="Users"
                      size={32}
                      className="text-muted-foreground"
                    />
                  )}
                </div>
                <h4 className="text-lg font-semibold text-foreground mb-1">
                  {conversation.name}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {conversation.participants.length} members
                </p>
                <div className="flex items-center justify-center space-x-2 mt-2">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <span className="text-xs text-muted-foreground">
                    {onlineCount} online
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action row */}
          <div className="flex items-center justify-center space-x-4 mt-4">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Icon name="Phone" size={20} />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Icon name="Video" size={20} />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Icon name="Search" size={20} />
            </Button>

            {/* Palette button — colored ring when a non-default theme is active */}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full relative"
              title="Change theme"
              onClick={() => setShowThemeModal(true)}
            >
              <Icon name="Palette" size={20} />
              {/* ── Fix 4 preview: small colored dot when theme is active ──
                  Uses the theme's sentMessageBg as the indicator color so
                  the dot always matches the active bubble color.
                  Hidden for the Default theme (no sentMessageBg).         */}
              {selectedTheme.sentMessageBg && (
                <span
                  className="absolute top-1 right-1 w-2 h-2 rounded-full border border-background"
                  style={{ backgroundColor: selectedTheme.sentMessageBg }}
                  aria-hidden="true"
                />
              )}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-2 text-sm font-medium transition-colors duration-200 ${
                  activeTab === tab.id
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon name={tab.icon} size={16} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "members" && (
            <div className="p-4 space-y-3">
              {conversation.participants.map((p) => (
                <ProfileView
                  key={p.id}
                  user={p}
                  showFullName={true}
                  showStatus={true}
                  showLastSeen={true}
                  showRole={true}
                  size="default"
                  currentUser={currentUser}
                  className="p-2 hover:bg-accent/50 rounded-lg transition-colors duration-200"
                />
              ))}
              {conversation.type === "group" && (
                <Button variant="outline" className="w-full mt-4">
                  <Icon name="UserPlus" size={16} className="mr-2" />
                  Add Member
                </Button>
              )}
            </div>
          )}

          {activeTab === "media" && (
            <div className="p-4">
              <div className="grid grid-cols-3 gap-2">
                {sharedMedia
                  .filter((i) => i.type === "image")
                  .map((item) => (
                    <div
                      key={item.id}
                      className="aspect-square rounded-lg overflow-hidden bg-secondary hover:opacity-80 transition-opacity cursor-pointer"
                    >
                      <AppImage
                        src={item.url!}
                        alt="Shared media"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeTab === "files" && (
            <div className="p-4 space-y-2">
              {sharedMedia
                .filter((i) => i.type === "file")
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center space-x-3 p-3 hover:bg-accent/50 rounded-lg cursor-pointer"
                  >
                    <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                      <Icon
                        name="File"
                        size={20}
                        className="text-muted-foreground"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-foreground truncate">
                        {item.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {item.size}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Icon name="Download" size={16} />
                    </Button>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 space-y-2">
          <Button variant="ghost" className="w-full justify-start">
            <Icon name="Bell" size={16} className="mr-3" />
            Notifications
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <Icon name="Archive" size={16} className="mr-3" />
            Archive Chat
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:text-destructive"
          >
            <Icon name="Trash2" size={16} className="mr-3" />
            Delete Chat
          </Button>
        </div>
      </div>

      <ThemeModal
        isOpen={showThemeModal}
        onClose={() => setShowThemeModal(false)}
        currentThemeId={selectedTheme.id}
        onSelectTheme={handleThemeSelect}
      />
    </>
  );
};

export default ConversationDetails;