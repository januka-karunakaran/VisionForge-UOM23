"use client";

import React, { useState, useRef, useEffect } from "react";
import { Bell, X } from "lucide-react";

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      message: "Please change theme color -001 A",
      sender: "Amanda",
      time: "2 min ago",
      read: false,
    },
    {
      id: 2,
      message: "Final product received -002B",
      sender: "Louis",
      time: "1 hour ago",
      read: false,
    },
    {
      id: 3,
      message: "New project assigned to you",
      sender: "System",
      time: "3 hours ago",
      read: true,
    },
  ]);

  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const removeNotification = (id, e) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 🔔 Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-xl p-2 transition hover:bg-slate-100"
      >
        <Bell className="h-6 w-6 text-slate-600" />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white shadow ring-2 ring-white">
            {unreadCount}
          </span>
        )}
      </button>

      {/* 🔥 Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-96 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl z-50">

          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-4 text-white">
            <h3 className="font-bold text-lg">Notifications</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-medium">
                No notifications
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`group flex items-start gap-4 px-5 py-4 border-b cursor-pointer transition ${
                    !n.read
                      ? "bg-indigo-50 hover:bg-indigo-100"
                      : "hover:bg-slate-50"
                  }`}
                >
                  {/* Dot */}
                  <div
                    className={`mt-2 h-2 w-2 rounded-full ${
                      !n.read ? "bg-indigo-600" : "bg-gray-300"
                    }`}
                  />

                  {/* Content */}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                      {n.message}
                    </p>

                    <div className="mt-2 flex justify-between text-xs text-slate-400">
                      <span>- {n.sender}</span>
                      <span>{n.time}</span>
                    </div>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={(e) => removeNotification(n.id, e)}
                    className="opacity-0 group-hover:opacity-100 transition"
                  >
                    <X className="h-4 w-4 text-gray-400 hover:text-red-500" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="flex justify-between items-center bg-slate-50 px-5 py-3">
              <span className="text-xs text-slate-400">
                {unreadCount} unread
              </span>

              <button
                onClick={() => setNotifications([])}
                className="text-sm font-bold text-red-600 hover:text-red-700"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;