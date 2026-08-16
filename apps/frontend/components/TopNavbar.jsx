"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import UserProfileDropdown from "../pages/UserProfileDropdown";
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
} from "../services/api";
import NotificationPanel from "./NotificationPanel";
import NotificationToastManager from "./NotificationToastManager";

const TopNavbar = ({
  setSidebarOpen = () => {},
  section = "company",
  title,
  desktopSidebarOpen = true,
  setDesktopSidebarOpen = () => {},
}) => {
  const pathname = usePathname();

  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] =
    useState(false);

  const getTitle = () => {
    const path = String(pathname || "").toLowerCase();

    if (path.includes("/company/dashboardsection")) return "Company Dashboard";
    if (path.includes("/company/proposalslistsection")) return "Proposals";
    if (path.includes("/company/createproposalsection")) return "Create Proposal";
    if (path.includes("/company/prdrepository")) return "PRD Repository";
    if (path.includes("/company/prd-details&editor"))
      return "PRD Details & Editor";
    if (path.includes("/company/editprofile")) return "Edit Profile";
    if (path.includes("/company/changepasswordpage"))
      return "Change Password";
    if (path.includes("/company/audit-trail")) return "Audit Trail";
    if (path.includes("/company/version-history")) return "Version History";
    if (path.includes("/company/kanban")) return "Kanban";

    if (path.includes("/client/dashboard")) return "Client Dashboard";
    if (path.includes("/client/editprofile")) return "Edit Profile";
    if (path.includes("/client/changepasswordpage"))
      return "Change Password";
    if (path.includes("/client/project")) return "Projects";
    if (path.includes("/client/proposal")) return "Proposals";
    if (path.includes("/client/document")) return "Documents";
    if (path.includes("/client/changerequest")) return "Change Requests";
    if (path.includes("/client/kanban")) return "Kanban";

    return title || "Dashboard";
  };

  const loadUnreadCount = async () => {
    try {
      const data = await getUnreadNotificationCount();
      setNotificationCount(data?.count || 0);
    } catch (error) {
      // Silently ignore auth errors (403/401) — redirect handled by UserProfileDropdown
      const msg = String(error?.message || "");
      if (!msg.includes("403") && !msg.includes("401") && !msg.includes("Forbidden")) {
        console.error("Failed to load unread count:", error);
      }
    }
  };

  const loadNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      // Silently ignore auth errors
      const msg = String(error?.message || "");
      if (!msg.includes("403") && !msg.includes("401") && !msg.includes("Forbidden")) {
        console.error("Failed to load notifications:", error);
      }
    }
  };

  const handleBellClick = async () => {
    setIsNotificationPanelOpen(true);
    await loadNotifications();
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.read) {
        await markNotificationAsRead(notification.id);
        await loadNotifications();
        await loadUnreadCount();
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  useEffect(() => {
    loadUnreadCount();
  }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-white px-6 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
          >
            <Menu />
          </button>

          <button
            type="button"
            onClick={() => setDesktopSidebarOpen((prev) => !prev)}
            className="hidden rounded-lg p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800 lg:flex"
          >
            {desktopSidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
          </button>

          <h1 className="text-xl font-bold">{getTitle()}</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              type="button"
              onClick={handleBellClick}
              className="rounded-full bg-gray-100 p-2 transition hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              <Bell />
            </button>

            {notificationCount > 0 && (
              <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-2 text-xs text-white">
                {notificationCount}
              </span>
            )}
          </div>

          <UserProfileDropdown section={section} />
        </div>
      </header>

      <NotificationPanel
        isOpen={isNotificationPanelOpen}
        notifications={notifications}
        onClose={() => setIsNotificationPanelOpen(false)}
        onNotificationClick={handleNotificationClick}
      />

      <NotificationToastManager />
    </>
  );
};

export default TopNavbar;