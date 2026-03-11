// web/src/components/ui/UserMenu.tsx

import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import type { ComponentProps } from "react";
import type { AppDispatch, RootState } from "redux/store";
import { logout } from "redux/slices/authSlice";
import AppIcon from "components/AppIcon";
import Button from "components/ui/Button";
import PresenceIndicator from "components/ui/PresenceIndicator";

// ─── Local UI Types ───────────────────────────────────────────────────────────

type IconName = ComponentProps<typeof AppIcon>["name"];

type MenuAction = "navigate" | "logout" | "help";

interface MenuItem {
  label: string;
  icon: IconName;
  action: MenuAction;
  path?: string;
  variant?: "destructive";
}

// ─── Component ───────────────────────────────────────────────────────────────

const UserMenu = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const currentUser = useSelector((state: RootState) => state.auth.user);

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMenuItemClick = (action: MenuAction, path?: string) => {
    setIsOpen(false);
    if (action === "navigate" && path) {
      navigate(path);
    } else if (action === "logout") {
      dispatch(logout());
      navigate("/login");
    }
    // "help" — wire up when help flow exists
  };

  const menuItems: MenuItem[] = [
    {
      label:  "Profile Settings",
      icon:   "Settings",
      action: "navigate",
      path:   "/user-profile-settings",
    },
    // Admin item — only added if role matches
    ...(currentUser?.role === "admin" || currentUser?.role === "moderator"
      ? [{
          label:  "Admin Dashboard",
          icon:   "Shield" as IconName,
          action: "navigate" as MenuAction,
          path:   "/admin-dashboard",
        }]
      : []),
    {
      label:  "Help & Support",
      icon:   "HelpCircle",
      action: "help",
    },
    {
      label:   "Sign Out",
      icon:    "LogOut",
      action:  "logout",
      variant: "destructive",
    },
  ];

  return (
    <div className="relative" ref={menuRef}>
      {/* ── Trigger ── */}
      <Button
        variant="ghost"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center space-x-2 px-2 py-2 hover:bg-accent/50 transition-colors duration-200"
      >
        <div className="relative">
          <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center overflow-hidden">
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.username}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <AppIcon name="User" size={16} />
            )}
          </div>
          <PresenceIndicator
            status={currentUser?.isOnline ? "online" : "offline"}
            size="sm"
            className="absolute -bottom-0.5 -right-0.5"
          />
        </div>
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium text-foreground">
            {currentUser?.username ?? "User"}
          </div>
          <div className="text-xs text-muted-foreground">
            {currentUser?.email ?? ""}
          </div>
        </div>
        <AppIcon
          name={isOpen ? "ChevronUp" : "ChevronDown"}
          size={16}
          className="hidden md:block transition-transform duration-200"
        />
      </Button>

      {/* ── Dropdown ── */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-popover border border-border rounded-lg shadow-lg z-50">
          {/* User info header */}
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center overflow-hidden">
                  {currentUser?.avatar ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <AppIcon name="User" size={20} />
                  )}
                </div>
                <PresenceIndicator
                  status={currentUser?.isOnline ? "online" : "offline"}
                  size="default"
                  className="absolute -bottom-1 -right-1"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-popover-foreground truncate">
                  {currentUser?.username ?? "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {currentUser?.email ?? ""}
                </p>
                {(currentUser?.role === "admin" ||
                  currentUser?.role === "moderator") && (
                  <p className="text-xs text-primary font-medium capitalize">
                    {currentUser.role}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-2">
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={() => handleMenuItemClick(item.action, item.path)}
                className={`w-full flex items-center space-x-3 px-4 py-2 text-left
                  hover:bg-accent/50 transition-colors duration-200
                  ${item.variant === "destructive"
                    ? "text-destructive"
                    : "text-popover-foreground"
                  }`}
              >
                <AppIcon
                  name={item.icon}
                  size={16}
                  className={
                    item.variant === "destructive" ? "text-destructive" : ""
                  }
                />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;