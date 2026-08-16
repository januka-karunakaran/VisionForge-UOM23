"use client";

import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { getNotifications } from "../services/api";
import { getNotificationMeta } from "./notificationMeta";

const NotificationToastManager = () => {
  const [toast, setToast] = useState(null);
  const lastNotificationId = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const checkNotifications = async () => {
      try {
        const data = await getNotifications();
        const list = Array.isArray(data) ? data : [];
        const latestUnread = list.find((notification) => !notification.read);

        if (latestUnread && latestUnread.id !== lastNotificationId.current) {
          lastNotificationId.current = latestUnread.id;
          setToast(latestUnread);

          if (timeoutRef.current) clearTimeout(timeoutRef.current);

          timeoutRef.current = setTimeout(() => {
            setToast(null);
          }, 4500);
        }
      } catch (err) {
        // Silently ignore auth errors (403/401) — handled by UserProfileDropdown
        const msg = String(err?.message || "");
        if (!msg.includes("403") && !msg.includes("401") && !msg.includes("Forbidden")) {
          console.error("Notification polling error:", err);
        }
      }
    };

    checkNotifications();

    const interval = setInterval(checkNotifications, 15000);

    return () => {
      clearInterval(interval);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!toast) return null;

  const meta = getNotificationMeta(toast.type);
  const Icon = meta.Icon;

  return (
    <div className="fixed right-6 top-6 z-[100] w-full max-w-sm">
      <div
        className={`overflow-hidden rounded-2xl border bg-white shadow-2xl ${meta.toastClass}`}
      >
        <div className="flex items-start gap-4 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50">
            <Icon className={`h-5 w-5 ${meta.iconClass}`} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-slate-900">
              {toast.title || "Notification"}
            </p>
            <p className="mt-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
              {meta.label}
            </p>
            <p className="mt-2 line-clamp-2 text-sm font-medium leading-relaxed text-slate-600">
              {toast.message || "-"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setToast(null)}
            className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close notification toast"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="h-1 w-full bg-slate-100">
          <div className="h-full w-full bg-gradient-to-r from-indigo-600 to-violet-600" />
        </div>
      </div>
    </div>
  );
};

export default NotificationToastManager;