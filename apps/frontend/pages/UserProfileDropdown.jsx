"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  LockKeyhole,
  User,
  ChevronRight,
  Palette,
} from "lucide-react";
import EditProfileModal from "./EditProfile";
import {
  getCurrentUserProfile,
  updateCurrentUserProfile,
} from "../services/api";
import { clearSession } from "../utils/auth";

const THEME_OPTIONS = [
  {
    id: "light",
    label: "Light",
    previewClassName:
      "bg-white border border-slate-200 before:absolute before:inset-x-2 before:top-2 before:h-1.5 before:rounded-full before:bg-slate-200 after:absolute after:left-2 after:right-6 after:top-6 after:h-1 after:rounded-full after:bg-slate-300",
  },
  {
    id: "dark",
    label: "Dark",
    previewClassName:
      "bg-slate-900 border border-slate-700 before:absolute before:inset-x-2 before:top-2 before:h-1.5 before:rounded-full before:bg-slate-700 after:absolute after:left-2 after:right-6 after:top-6 after:h-1 after:rounded-full after:bg-slate-600",
  },
  {
    id: "system",
    label: "Match browser",
    previewClassName:
      "border border-slate-200 bg-[linear-gradient(90deg,#111827_0%,#111827_50%,#ffffff_50%,#ffffff_100%)] before:absolute before:left-2 before:right-[calc(50%+0.5rem)] before:top-2 before:h-1.5 before:rounded-full before:bg-slate-600 after:absolute after:left-[calc(50%+0.5rem)] after:right-2 after:top-2 after:h-1.5 after:rounded-full after:bg-slate-200",
  },
];

const UserProfileDropdown = ({ section = "company" }) => {
  const router = useRouter();
  const dropdownRef = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [activePanel, setActivePanel] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState("light");

  const [userData, setUserData] = useState({
    userId: "",
    username: "User",
    email: "",
    role: "",
    profileImage: "",
    assignedTasks: [],
    assignedProjects: [],
  });

  const showToastMessage = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 1500);
  };

  const applyTheme = (theme, showToast = true) => {
    const selected = theme || "light";
    setSelectedTheme(selected);

    if (typeof window === "undefined") return;

    localStorage.setItem("crms_theme", selected);

    const root = document.documentElement;
    const body = document.body;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDarkTheme =
      selected === "dark" || (selected === "system" && prefersDark);

    root.classList.toggle("dark", isDarkTheme);
    body.classList.toggle("dark", isDarkTheme);
    root.dataset.theme = selected;
    body.dataset.theme = selected;

    if (showToast) {
      const label =
        THEME_OPTIONS.find((option) => option.id === selected)?.label ||
        selected;
      showToastMessage(`${label} theme selected`);
    }
  };

  const loadProfile = async () => {
    try {
      const profile = await getCurrentUserProfile();
      if (!profile) return;

      setUserData({
        userId: profile.userId || profile.id || "",
        username:
          profile.username ||
          profile.fullName ||
          profile.name ||
          profile.companyName ||
          "User",
        email: profile.email || "",
        role: profile.role || "",
        profileImage: profile.profileImage || "",
        assignedTasks: Array.isArray(profile.assignedTasks)
          ? profile.assignedTasks
          : [],
        assignedProjects: Array.isArray(profile.assignedProjects)
          ? profile.assignedProjects
          : [],
      });
    } catch (error) {
      console.error("Failed to load current user profile:", error);
    }
  };

  useEffect(() => {
    const savedTheme =
      typeof window !== "undefined"
        ? localStorage.getItem("crms_theme") || "light"
        : "light";

    applyTheme(savedTheme, false);
  }, []);

  useEffect(() => {
    loadProfile();

    const interval = setInterval(loadProfile, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleSystemThemeChange = () => {
      if (localStorage.getItem("crms_theme") === "system") {
        applyTheme("system", false);
      }
    };

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener?.("change", handleSystemThemeChange);

    return () => {
      media.removeEventListener?.("change", handleSystemThemeChange);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setActivePanel(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    clearSession();
    setIsOpen(false);
    setActivePanel(null);
    setIsEditOpen(false);
    router.replace("/login");
  };

  const normalizedRole = String(userData.role || section || "").toUpperCase();

  const changePasswordPath =
    normalizedRole.includes("CLIENT") || section === "client"
      ? "/client/ChangePasswordPage"
      : "/company/ChangePasswordPage";

  const menuItemClass =
    "flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-[15px] font-medium text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800";

  const userInitials = (userData.username || "User")
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => {
          setIsOpen((prev) => {
            const next = !prev;
            if (!next) setActivePanel(null);
            return next;
          });
        }}
        className="rounded-full p-1.5 transition hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        {userData.profileImage ? (
          <img
            src={userData.profileImage}
            alt="Profile"
            className="h-8 w-8 rounded-full object-cover shadow-[0_6px_14px_rgba(15,23,42,0.18)]"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-sm font-semibold text-white shadow-[0_6px_14px_rgba(15,23,42,0.18)]">
            {(userData.username || "U").charAt(0)}
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-3">
          <div className="relative w-[340px] overflow-visible rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.16)] dark:border-slate-700 dark:bg-slate-900">
            {activePanel === "theme" && (
              <div className="absolute left-0 top-[255px] z-10 h-[180px] w-[260px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.16)] dark:border-slate-700 dark:bg-slate-900">
                <div className="p-1.5">
                  {THEME_OPTIONS.map((option) => {
                    const isSelected = selectedTheme === option.id;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          applyTheme(option.id);
                          setActivePanel(null);
                        }}
                        className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition ${
                          isSelected
                            ? "bg-blue-50 dark:bg-blue-950/40"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                            isSelected
                              ? "border-blue-600"
                              : "border-slate-400"
                          }`}
                        >
                          {isSelected && (
                            <span className="h-2 w-2 rounded-full bg-blue-600" />
                          )}
                        </span>

                        <span
                          className={`relative h-9 w-12 shrink-0 overflow-hidden rounded-md ${option.previewClassName}`}
                        />

                        <span className="text-[14px] font-medium text-slate-700 dark:text-slate-200">
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="p-3.5">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center gap-4">
                  {userData.profileImage ? (
                    <img
                      src={userData.profileImage}
                      alt="Profile"
                      className="h-[72px] w-[72px] rounded-full object-cover shadow-sm"
                    />
                  ) : (
                    <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#5b4cc4] text-[28px] font-semibold text-white">
                      {userInitials}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="truncate text-[18px] font-semibold text-slate-900 dark:text-white">
                      {userData.username}
                    </p>
                    <p className="mt-0.5 truncate text-[13px] text-slate-500 dark:text-slate-300">
                      {userData.email}
                    </p>
                  </div>
                </div>
              </div>

              {toast && (
                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] font-medium text-emerald-700">
                  {toast}
                </div>
              )}

              <div className="mt-4 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditOpen(true);
                    setIsOpen(false);
                    setActivePanel(null);
                  }}
                  className={menuItemClass}
                >
                  <div className="flex items-center gap-3">
                    <User size={16} />
                    <span>Profile</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setActivePanel(null);
                    router.push(changePasswordPath);
                  }}
                  className={menuItemClass}
                >
                  <div className="flex items-center gap-3">
                    <LockKeyhole size={16} />
                    <span>Change password</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setActivePanel((prev) => (prev === "theme" ? null : "theme"))
                  }
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-[15px] font-medium transition ${
                    activePanel === "theme"
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Palette size={16} />
                    <span>Theme</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-400" />
                </button>
              </div>

              <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-700">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="group flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-medium text-slate-900 transition hover:bg-rose-50 hover:text-rose-700 dark:text-slate-200 dark:hover:bg-rose-950/30"
                >
                  <LogOut size={16} />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <EditProfileModal
        isOpen={isEditOpen}
        onClose={async () => {
          setIsEditOpen(false);
          await loadProfile();
        }}
        userData={userData}
        onSave={async (updatedUser) => {
          await updateCurrentUserProfile({
            username: updatedUser.username,
            profileImage:
              updatedUser.profileImage || updatedUser.previewImage || "",
          });

          await loadProfile();
          showToastMessage("Profile updated!");
        }}
      />
    </div>
  );
};

export default UserProfileDropdown;
