// apps/web/src/pages/chat-dashboard/components/ThemeModal.tsx
import React, { useState, useEffect } from "react";
import Icon from "components/AppIcon";
import Button from "components/ui/Button";
import { cn } from "lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Theme {
  id: string;
  name: string;
  subtitle?: string;
  thumbnail: string;
  background: string;
  sentMessageBg: string;
  sentMessageText: string;
}

export interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentThemeId?: string;
  onSelectTheme: (theme: Theme) => void;
}

// ─── Theme Catalogue ─────────────────────────────────────────────────────────

export const DEFAULT_THEMES: Theme[] = [
  {
    id: "nebula",
    name: "Nebula and a Star",
    thumbnail: "radial-gradient(circle at 40% 60%, #7b2d8b 0%, #1a1a3e 60%, #0f0f2d 100%)",
    background: "radial-gradient(ellipse at 30% 70%, #7b2d8b 0%, #1a1a3e 50%, #0d0d2b 100%)",
    sentMessageBg: "#7bb3f0",
    sentMessageText: "#ffffff",
  },
  {
    id: "sky-garden",
    name: "Sky Garden",
    subtitle: "Art by Hayden Clay",
    thumbnail: "linear-gradient(135deg, #56ab2f 0%, #1a6b3c 50%, #0e4d6e 100%)",
    background: "linear-gradient(160deg, #1a6b3c 0%, #0e4d6e 60%, #0a2540 100%)",
    sentMessageBg: "#56ab2f",
    sentMessageText: "#ffffff",
  },
  {
    id: "basketball",
    name: "Basketball",
    thumbnail: "radial-gradient(circle, #f56036 0%, #c13a15 70%, #8b2200 100%)",
    background: "linear-gradient(135deg, #f56036 0%, #c13a15 50%, #8b2200 100%)",
    sentMessageBg: "#f56036",
    sentMessageText: "#ffffff",
  },
  {
    id: "blackpink",
    name: "BLACKPINK",
    subtitle: "Deadline",
    thumbnail: "linear-gradient(135deg, #1a1a1a 0%, #3d0020 50%, #000000 100%)",
    background: "linear-gradient(135deg, #1a1a1a 0%, #3d0020 60%, #000000 100%)",
    sentMessageBg: "#e91e63",
    sentMessageText: "#ffffff",
  },
  {
    id: "megan-moroney",
    name: "Megan Moroney",
    subtitle: "Cloud 9",
    thumbnail: "radial-gradient(circle at 50% 40%, #f4a0c4 0%, #e07bab 40%, #c4587f 100%)",
    background: "radial-gradient(ellipse at 50% 30%, #f4a0c4 0%, #e07bab 50%, #c4587f 100%)",
    sentMessageBg: "#e07bab",
    sentMessageText: "#ffffff",
  },
  {
    id: "year-of-the-horse",
    name: "Year of the Horse",
    thumbnail: "linear-gradient(135deg, #c8360b 0%, #f07b20 50%, #d4a017 100%)",
    background: "linear-gradient(135deg, #c8360b 0%, #f07b20 60%, #d4a017 100%)",
    sentMessageBg: "#f07b20",
    sentMessageText: "#ffffff",
  },
  {
    id: "valentine",
    name: "Valentine's Day",
    subtitle: "Groove on with love",
    thumbnail: "radial-gradient(circle at 40% 40%, #f9a8d4 0%, #f472b6 50%, #db2777 100%)",
    background: "radial-gradient(ellipse at 40% 30%, #f9a8d4 0%, #f472b6 50%, #db2777 100%)",
    sentMessageBg: "#db2777",
    sentMessageText: "#ffffff",
  },
  {
    id: "simpsons",
    name: "The Simpsons",
    thumbnail: "linear-gradient(135deg, #fde047 0%, #facc15 50%, #a3e635 100%)",
    background: "linear-gradient(160deg, #fde047 0%, #facc15 50%, #a3e635 100%)",
    sentMessageBg: "#facc15",
    sentMessageText: "#1a1a1a",
  },
  {
    id: "ocean",
    name: "Ocean Breeze",
    thumbnail: "linear-gradient(135deg, #0077b6 0%, #00b4d8 60%, #90e0ef 100%)",
    background: "linear-gradient(160deg, #0077b6 0%, #00b4d8 60%, #90e0ef 100%)",
    sentMessageBg: "#0077b6",
    sentMessageText: "#ffffff",
  },
  {
    id: "midnight",
    name: "Midnight",
    thumbnail: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
    background: "linear-gradient(160deg, #0f0c29 0%, #302b63 60%, #24243e 100%)",
    sentMessageBg: "#6c63ff",
    sentMessageText: "#ffffff",
  },
  {
    id: "default",
    name: "Default",
    thumbnail: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    background: "",
    sentMessageBg: "",
    sentMessageText: "",
  },
];

// ─── Preview Messages ─────────────────────────────────────────────────────────

const PREVIEW_MESSAGES = [
  { id: "p1", text: "There are many themes to choose from and they're all a little different.", isMe: true },
  { id: "p2", text: "You'll see the messages that you send to other people in this colour.", isMe: true },
  { id: "p3", text: "And messages from your friends will look like this.", isMe: false },
  { id: "p4", text: "Click Select to select this theme.", isMe: true },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

const ThemeModal = React.forwardRef<HTMLDivElement, ThemeModalProps>(
  ({ isOpen, onClose, currentThemeId, onSelectTheme }, ref) => {
    const [selectedTheme, setSelectedTheme] = useState<Theme>(
      () => DEFAULT_THEMES.find((t) => t.id === currentThemeId) ?? DEFAULT_THEMES[0],
    );

    useEffect(() => {
      if (!currentThemeId) return;
      const match = DEFAULT_THEMES.find((t) => t.id === currentThemeId);
      if (match) setSelectedTheme(match);
    }, [currentThemeId]);

    useEffect(() => {
      if (!isOpen) return;
      const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSelect = () => { onSelectTheme(selectedTheme); onClose(); };

    const previewBg      = selectedTheme.background     || "hsl(var(--background))";
    const previewMsgBg   = selectedTheme.sentMessageBg  || "hsl(var(--primary))";
    const previewMsgText = selectedTheme.sentMessageText || "hsl(var(--primary-foreground))";

    return (
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        aria-modal="true"
        role="dialog"
        aria-label="Preview and select theme"
      >
        <div
          ref={ref}
          className={cn(
            // Mobile: full-width sheet that slides up from the bottom
            "bg-card border border-border w-full shadow-2xl overflow-hidden flex flex-col",
            "rounded-t-2xl sm:rounded-2xl",
            // Desktop: constrained width
            "sm:max-w-2xl",
          )}
          // Mobile: 92dvh keeps it off the very top; desktop: 90vh cap
          style={{ maxHeight: "92dvh" }}
        >
          {/* ── Drag handle (mobile only) ─────────────────────────── */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden" aria-hidden="true">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          {/* ── Header ───────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-5 py-3 sm:px-6 sm:py-4 border-b border-border flex-shrink-0">
            <h2 className="text-base sm:text-lg font-semibold text-foreground">
              Preview and select theme
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close theme picker"
              className="rounded-full"
            >
              <Icon name="X" size={20} />
            </Button>
          </div>

          {/* ── Body ─────────────────────────────────────────────────
              Mobile  : column — thumbnail strip on top, preview below
              Desktop : row    — sidebar list on left, preview on right  */}
          <div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-hidden">

            {/* ── Theme selector ──────────────────────────────────────
                Mobile  : horizontal scrolling pill strip
                Desktop : vertical scrollable list                      */}
            <div
              className={cn(
                "flex-shrink-0 border-border",
                // Mobile: horizontal strip with a bottom border
                "flex flex-row overflow-x-auto gap-1 px-3 py-2 border-b sm:border-b-0",
                // Desktop: vertical sidebar with a right border
                "sm:flex-col sm:overflow-y-auto sm:overflow-x-hidden sm:w-56 sm:px-0 sm:py-0 sm:gap-0 sm:border-r",
                // Hide scrollbar but keep scroll functional
                "scrollbar-hide",
              )}
              role="listbox"
              aria-label="Theme list"
            >
              {DEFAULT_THEMES.map((theme) => {
                const isActive = selectedTheme.id === theme.id;
                return (
                  <button
                    key={theme.id}
                    role="option"
                    aria-selected={isActive}
                    onClick={() => setSelectedTheme(theme)}
                    className={cn(
                      "flex-shrink-0 flex items-center transition-colors duration-150",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      // Mobile: compact vertical pill (thumbnail + name stacked)
                      "flex-col gap-1 px-2 py-2 rounded-xl min-w-[4rem]",
                      // Desktop: full horizontal row
                      "sm:flex-row sm:gap-0 sm:space-x-3 sm:px-4 sm:py-3 sm:rounded-none sm:min-w-0 sm:text-left sm:w-full",
                      isActive
                        ? "bg-accent/60"
                        : "hover:bg-accent/30",
                    )}
                  >
                    {/* Thumbnail circle — inline style required for dynamic gradient */}
                    <div
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex-shrink-0 border border-border/60"
                      style={{ background: theme.thumbnail }}
                      aria-hidden="true"
                    />

                    {/* Name — truncated on desktop, tiny below circle on mobile */}
                    <div className="flex-1 min-w-0 flex sm:block items-center justify-between">
                      <p className={cn(
                        "font-medium text-foreground text-center sm:text-left truncate",
                        // Smaller text on mobile to fit in the strip
                        "text-[10px] sm:text-sm max-w-[4rem] sm:max-w-none",
                      )}>
                        {theme.name}
                      </p>
                      {theme.subtitle && (
                        <p className="hidden sm:block text-xs text-muted-foreground truncate">
                          {theme.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Checkmark — desktop only (no room on mobile strip) */}
                    {isActive && (
                      <Icon
                        name="Check"
                        size={16}
                        className="hidden sm:block text-primary flex-shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* ── Preview panel — inline style required for dynamic background ── */}
            <div
              className="flex-1 flex flex-col justify-end gap-2 p-4 overflow-hidden transition-all duration-300 min-h-[160px] sm:min-h-0"
              style={{ background: previewBg }}
              aria-label="Theme preview"
            >
              {PREVIEW_MESSAGES.map((msg) => (
                <div
                  key={msg.id}
                  className={cn("flex", msg.isMe ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "px-3 py-2 sm:px-4 rounded-2xl max-w-[85%] sm:max-w-[80%] text-xs sm:text-sm leading-snug shadow-sm",
                      !msg.isMe && "bg-white/90 text-gray-800",
                    )}
                    // Sent bubble colours are dynamic — inline style required
                    style={
                      msg.isMe
                        ? { backgroundColor: previewMsgBg, color: previewMsgText }
                        : undefined
                    }
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              <p className="text-center text-xs text-white/50 mt-1 select-none">09:32</p>
            </div>
          </div>

          {/* ── Footer ───────────────────────────────────────────── */}
          <div className="flex flex-shrink-0 border-t border-border">
            <button
              onClick={onClose}
              className={cn(
                "flex-1 py-3 sm:py-4 text-sm font-medium text-foreground",
                "hover:bg-accent/50 transition-colors duration-150",
                "border-r border-border",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              )}
            >
              Cancel
            </button>
            <button
              onClick={handleSelect}
              className={cn(
                "flex-1 py-3 sm:py-4 text-sm font-medium text-primary",
                "hover:bg-accent/50 transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              )}
            >
              Select
            </button>
          </div>
        </div>
      </div>
    );
  },
);

ThemeModal.displayName = "ThemeModal";
export default ThemeModal;