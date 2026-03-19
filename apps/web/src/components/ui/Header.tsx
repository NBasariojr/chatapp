import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import type { ComponentProps } from "react";
import type { RootState } from "redux/store";
import AppIcon from "../../components/AppIcon";
import Button from "../../components/ui/Button";
import NotificationBadge from "../../components/ui/NotificationBadge";
import NotificationPanel from "../../components/ui/NotificationPanel";
import UserMenu from "../../components/ui/UserMenu";
import SearchOverlay from "../../components/ui/SearchOverlay";
import FriendRequests from "../../components/ui/FriendRequests";
import { chatService } from "../../services/chat.service";

// ─── Local UI Types ───────────────────────────────────────────────────────────

type IconName = ComponentProps<typeof AppIcon>["name"];

interface NavItem {
    label: string;
    path: string;
    icon: IconName;
    badge?: number;
    roles?: Array<"user" | "admin" | "moderator">; // undefined = visible to all
}

// ─── Constants ───────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
    { label: "Messages", path: "/chat-dashboard", icon: "MessageCircle" },
    { label: "Groups", path: "/group-chat-management", icon: "Users" },
    { label: "Profile", path: "/user-profile-settings", icon: "User" },
];

const ADMIN_NAV_ITEMS: NavItem[] = [
    { label: "Admin", path: "/admin-dashboard", icon: "Shield", roles: ["admin", "moderator"] },
];

// ─── Component ───────────────────────────────────────────────────────────────

const Header = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const currentUser = useSelector((state: RootState) => state.auth.user);
    const unreadCounts = useSelector(
        // Derive from chatSlice once unreadCounts is added to ChatState
        (state: RootState) =>
            (state.chat as unknown as { unreadCounts?: Record<string, number> })
                .unreadCounts ?? {}
    );

    const [activeOverlay, setActiveOverlay] = useState<'search' | 'friendRequests' | 'notifications' | null>(null);
    const [friendRequestCount, setFriendRequestCount] = useState(0);

    const handleFriendRequestHandled = useCallback(async () => {
        try {
            const requests = await chatService.getFriendRequests();
            setFriendRequestCount(requests?.length || 0);
        } catch (error) {
            console.error('Failed to fetch friend requests:', error);
        }
    }, []);

    // Fetch friend requests count
    useEffect(() => {
        handleFriendRequestHandled(); // initial fetch on mount
        const interval = setInterval(handleFriendRequestHandled, 30000);
        return () => clearInterval(interval);
    }, [handleFriendRequestHandled]);

    // Derive total unread from all rooms
    const totalUnread = Object.values(unreadCounts).reduce(
        (sum, n) => sum + n,
        0
    );

    const userRole = currentUser?.role;

    // Filter admin items by user role
    const visibleAdminItems = ADMIN_NAV_ITEMS.filter(
        (item) => !item.roles || (userRole && item.roles.includes(userRole))
    );

    const allNavItems = [...NAV_ITEMS, ...visibleAdminItems];

    const isActive = (path: string) => location.pathname === path;

    const renderNavButton = (item: NavItem, mobile = false) => (
        <div key={item.path} className="relative">
            <Button
                variant="ghost"
                size={mobile ? "sm" : undefined}
                onClick={() => navigate(item.path)}
                className={`
          ${mobile ? "flex flex-col items-center space-y-1 px-2 py-2" : "flex items-center space-x-2 px-3 py-2"}
          hover:bg-accent/50 transition-colors duration-200
          ${isActive(item.path) ? "text-primary" : ""}
        `}
            >
                <AppIcon name={item.icon} size={mobile ? 16 : 18} />
                <span className={`${mobile ? "text-xs" : "text-sm"} font-medium`}>
                    {item.label}
                </span>
            </Button>
            {item.badge !== undefined && item.badge > 0 && (
                <NotificationBadge
                    count={item.badge}
                    className="absolute -top-1 -right-1"
                />
            )}
        </div>
    );

    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
                <div className="flex items-center justify-between h-16 px-4">

                    {/* ── Logo ── */}
                    <Button
                        variant="ghost"
                        onClick={() => navigate("/chat-dashboard")}
                        className="flex items-center space-x-2 p-2 hover:bg-accent/50 transition-colors duration-200"
                    >
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                            <AppIcon name="MessageSquare" size={20} color="white" />
                        </div>
                        <span className="text-xl font-semibold text-foreground">LinkUp</span>
                    </Button>

                    {/* ── Desktop Nav ── */}
                    <nav className="hidden md:flex items-center space-x-1">
                        {allNavItems.map((item) => renderNavButton(item))}
                    </nav>

                    {/* ── Right Section ── */}
                    <div className="flex items-center space-x-3">
                        {/* Search */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setActiveOverlay(activeOverlay === 'search' ? null : 'search')}
                            className="hover:bg-accent/50 transition-colors duration-200"
                        >
                            <AppIcon name={activeOverlay === 'search' ? "X" : "Search"} size={20} />
                        </Button>

                        {/* Friend Requests */}
                        <div className="relative">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setActiveOverlay(activeOverlay === 'friendRequests' ? null : 'friendRequests')}
                                className="hover:bg-accent/50 transition-colors duration-200"
                            >
                                <AppIcon name="UserPlus" size={20} />
                            </Button>
                            {friendRequestCount > 0 && (
                                <NotificationBadge
                                    count={friendRequestCount}
                                    className="absolute -top-1 -right-1"
                                />
                            )}
                        </div>

                        {/* Notifications */}
                        <div className="relative">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setActiveOverlay(activeOverlay === 'notifications' ? null : 'notifications')}
                                className="hover:bg-accent/50 transition-colors duration-200"
                            >
                                <AppIcon name={activeOverlay === 'notifications' ? "X" : "Bell"} size={20} />
                            </Button>
                            {totalUnread > 0 && (
                                <NotificationBadge
                                    count={totalUnread}
                                    className="absolute -top-1 -right-1"
                                />
                            )}
                        </div>

                        {/* User Menu */}
                        <UserMenu />
                    </div>
                </div>

                {/* ── Mobile Nav ── */}
                <div className="md:hidden border-t border-border">
                    <nav className="flex items-center justify-around py-2">
                        {allNavItems.map((item) => renderNavButton(item, true))}
                    </nav>
                </div>
            </header>
            <SearchOverlay
                isOpen={activeOverlay === 'search'}
                onClose={() => setActiveOverlay(null)}
            />
            <FriendRequests
                isOpen={activeOverlay === 'friendRequests'}
                onClose={() => setActiveOverlay(null)}
                onRequestHandled={handleFriendRequestHandled}
            />
            <NotificationPanel
                isOpen={activeOverlay === 'notifications'}
                onClose={() => setActiveOverlay(null)}
            />
        </>
    );
};

export default Header;