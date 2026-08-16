"use client";

import React, { useEffect, useRef, useState } from "react";
import { Camera, Info, SquareCheckBig, X, CheckCircle2, AlertCircle, Loader2, User2 } from "lucide-react";
import {
  getCurrentUserProfile,
  updateCurrentUserProfile,
} from "../services/api";

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read the selected image"));
    reader.readAsDataURL(file);
  });

const EditProfileModal = ({ isOpen = true, onClose, userData = null, onSave }) => {
  const [formData, setFormData] = useState({
    username: "",
    role: "",
    userId: "",
    email: "",
    profileImage: "",
    previewImage: "",
    assignedTasks: [],
    assignedProjects: [],
  });

  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const overlayRef = useRef(null);

  const loadProfile = async () => {
    try {
      setIsLoadingProfile(true);
      setSaveError("");
      const profile = userData || (await getCurrentUserProfile());
      const image = profile?.profileImage || "";
      setFormData({
        username:
          profile?.username ||
          profile?.fullName ||
          profile?.name ||
          profile?.companyName ||
          "",
        role: profile?.role || "",
        userId: profile?.userId || profile?.id || "",
        email: profile?.email || "",
        profileImage: image,
        previewImage: image,
        assignedTasks: Array.isArray(profile?.assignedTasks) ? profile.assignedTasks : [],
        assignedProjects: Array.isArray(profile?.assignedProjects) ? profile.assignedProjects : [],
      });
    } catch (error) {
      console.error("Profile load error:", error);
      setSaveError("Failed to load profile details.");
    } finally {
      setIsLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadProfile();
  }, [isOpen, userData]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === "Escape") handleCancel();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  if (!isOpen) return null;

  const initials =
    formData.username
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
    setSaveError("");
    setSaveSuccess(false);
  };

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setFormData((prev) => ({ ...prev, profileImage: dataUrl, previewImage: dataUrl }));
    } catch (error) {
      console.error("Image read error:", error);
      setSaveError("Failed to read selected image.");
    }
  };

  const handleCancel = () => {
    if (onClose) onClose();
    else window.history.back();
  };

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) handleCancel();
  };

  const handleSave = async () => {
    if (!formData.username.trim()) {
      setErrors({ username: "Display name is required" });
      return;
    }
    try {
      setIsSaving(true);
      setSaveError("");
      setSaveSuccess(false);
      const payload = {
        username: formData.username,
        profileImage: formData.profileImage || formData.previewImage || "",
      };
      const updatedProfile = onSave
        ? await onSave({ ...userData, ...formData, ...payload })
        : await updateCurrentUserProfile(payload);

      if (updatedProfile) {
        setFormData((prev) => ({
          ...prev,
          username: updatedProfile.username || updatedProfile.fullName || updatedProfile.name || prev.username,
          profileImage:
            updatedProfile.profileImage && updatedProfile.profileImage !== ""
              ? updatedProfile.profileImage
              : prev.profileImage,
          previewImage:
            updatedProfile.profileImage && updatedProfile.profileImage !== ""
              ? updatedProfile.profileImage
              : prev.previewImage,
        }));
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        handleCancel();
      }, 1200);
    } catch (error) {
      console.error("Profile save error:", error);
      setSaveError("Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      style={{ animation: "fadeIn 0.2s ease" }}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-[0_32px_80px_rgba(15,23,42,0.22)] overflow-hidden dark:border-slate-700 dark:bg-slate-900"
        style={{ animation: "slideUp 0.25s ease" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">
              Account
            </p>
            <h2 className="mt-0.5 text-[22px] font-bold tracking-tight text-slate-900 dark:text-white">
              Edit Profile
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isLoadingProfile}
              className={`inline-flex h-9 items-center justify-center gap-2 rounded-lg px-5 text-[13px] font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                saveSuccess
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {isSaving ? (
                <><Loader2 size={14} className="animate-spin" /> Saving…</>
              ) : saveSuccess ? (
                <><CheckCircle2 size={14} /> Saved!</>
              ) : (
                "Save changes"
              )}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Status banners */}
          {saveError && (
            <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400">
              <AlertCircle size={15} className="shrink-0" />
              {saveError}
            </div>
          )}
          {isLoadingProfile && (
            <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
              <Loader2 size={14} className="animate-spin shrink-0" />
              Loading profile…
            </div>
          )}

          <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr]">
            {/* Avatar column */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                {formData.previewImage ? (
                  <img
                    src={formData.previewImage}
                    alt="Profile"
                    className="h-28 w-28 rounded-2xl object-cover shadow-md ring-2 ring-white dark:ring-slate-700"
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-[40px] font-bold text-white shadow-md">
                    {initials}
                  </div>
                )}
                {/* Hover overlay */}
                <label
                  className="absolute inset-0 flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl bg-black/0 text-white opacity-0 transition-all group-hover:bg-black/45 group-hover:opacity-100"
                  title="Change profile photo"
                >
                  <Camera size={20} />
                  <span className="text-[11px] font-semibold">Change</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Click photo to change
              </p>
            </div>

            {/* Form fields */}
            <div className="space-y-4">
              {/* Display name */}
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Display name
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Your full name"
                  className={`w-full rounded-xl border px-4 py-2.5 text-[15px] font-medium text-slate-900 outline-none transition placeholder:text-slate-300 focus:ring-2 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-600 ${
                    errors.username
                      ? "border-rose-400 focus:border-rose-400 focus:ring-rose-100 dark:focus:ring-rose-900/40"
                      : "border-slate-200 focus:border-indigo-400 focus:ring-indigo-100 dark:border-slate-600 dark:focus:border-indigo-500 dark:focus:ring-indigo-900/40"
                  }`}
                />
                {errors.username && (
                  <p className="mt-1.5 text-xs text-rose-500">{errors.username}</p>
                )}
              </div>

              {/* Read-only fields */}
              <div className="grid gap-3 sm:grid-cols-2">
                <ReadOnlyField label="Role" value={formData.role} />
                <ReadOnlyField label="Email" value={formData.email} />
              </div>
              <ReadOnlyField label="User ID" value={formData.userId} mono />
            </div>
          </div>

          {/* Activity sections */}
          <div className="border-t border-slate-100 dark:border-slate-800">
            <div className="grid gap-0 divide-y divide-slate-100 dark:divide-slate-800 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              <ActivitySection
                title="Recent Tasks"
                count={formData.assignedTasks.length}
                items={formData.assignedTasks}
                emptyText="No tasks assigned yet."
                renderItem={(task, i) => (
                  <WorkItem
                    key={task.id || i}
                    icon={<SquareCheckBig size={14} />}
                    title={task.title}
                    badge={task.status}
                    sub={task.projectName}
                  />
                )}
              />
              <ActivitySection
                title="Assigned Projects"
                count={formData.assignedProjects.length}
                items={formData.assignedProjects}
                emptyText="No projects assigned yet."
                renderItem={(project, i) => (
                  <WorkItem
                    key={project.id || i}
                    icon={<Info size={14} />}
                    title={project.name || project.title}
                    badge={project.status}
                    sub={project.description}
                  />
                )}
              />
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
      `}</style>
    </div>
  );
};

/* ─── Sub-components ─────────────────────────────────────────────── */

const ReadOnlyField = ({ label, value, mono = false }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/60">
    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
      {label}
    </p>
    <p
      className={`truncate text-[14px] font-medium text-slate-600 dark:text-slate-300 ${
        mono ? "font-mono text-[12px]" : ""
      }`}
    >
      {value || <span className="text-slate-300 dark:text-slate-600">—</span>}
    </p>
  </div>
);

const ActivitySection = ({ title, count, items, emptyText, renderItem }) => (
  <div className="p-6">
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white">{title}</h3>
      <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
        {count}
      </span>
    </div>
    {items.length > 0 ? (
      <div className="space-y-3">{items.map(renderItem)}</div>
    ) : (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-[13px] text-slate-400 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-500">
        {emptyText}
      </div>
    )}
  </div>
);

const WorkItem = ({ icon, title, badge, sub }) => (
  <div className="flex items-start gap-2.5 rounded-lg px-3 py-2.5 transition hover:bg-slate-50 dark:hover:bg-slate-800">
    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-400">
      {icon}
    </span>
    <div className="min-w-0 flex-1">
      <p className="truncate text-[13px] font-semibold text-slate-900 dark:text-slate-100">
        {title || "Untitled"}
      </p>
      {sub && (
        <p className="mt-0.5 line-clamp-1 text-[12px] text-slate-400 dark:text-slate-500">{sub}</p>
      )}
    </div>
    {badge && (
      <span className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
        {String(badge).replaceAll("_", " ")}
      </span>
    )}
  </div>
);

export default EditProfileModal;