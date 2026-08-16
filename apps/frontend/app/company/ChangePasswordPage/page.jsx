"use client";

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { changePassword } from "@/services/api";
import { getPasswordError, validatePassword } from "@/utils/validators";

export default function CompanyChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleContinue = async () => {
    setError("");
    setSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!validatePassword(newPassword)) {
      setError(getPasswordError(newPassword));
      return;
    }

    try {
      setLoading(true);
      const response = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setSuccess(response?.message || "Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        router.push("/company/DashboardSection");
      }, 800);
    } catch (err) {
      setError(err.message || "Failed to change password");
      return;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-5xl items-center justify-center">
      <div className="w-full max-w-[430px] px-4 py-8 text-center">
        <h2 className="text-[34px] font-medium tracking-tight text-slate-900 dark:text-white">
          Change your password
        </h2>
        <p className="mx-auto mt-5 max-w-[360px] text-[16px] leading-8 text-slate-600 dark:text-slate-400">
          Enter your current password and a new password below.
        </p>

        <div className="mt-8 space-y-3">
          <PasswordField
            label="Current password"
            value={currentPassword}
            onChange={setCurrentPassword}
            visible={showCurrentPassword}
            onToggle={() => setShowCurrentPassword((prev) => !prev)}
          />
          <PasswordField
            label="New password"
            value={newPassword}
            onChange={setNewPassword}
            visible={showNewPassword}
            onToggle={() => setShowNewPassword((prev) => !prev)}
          />
          <PasswordField
            label="Re-enter new password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            visible={showConfirmPassword}
            onToggle={() => setShowConfirmPassword((prev) => !prev)}
          />
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-left text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleContinue}
          disabled={loading}
          className="mt-7 inline-flex h-[58px] w-full max-w-[390px] items-center justify-center rounded-full bg-indigo-600 px-6 text-[17px] font-medium text-white transition hover:bg-indigo-700 dark:hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Updating..." : "Continue"}
        </button>
      </div>
    </div>
  );
}

const PasswordField = ({
  label,
  value,
  onChange,
  visible,
  onToggle,
}) => {
  return (
    <div className="mx-auto max-w-[390px] text-left">
      <label className="mb-2 block px-4 text-[13px] font-medium text-blue-600 dark:text-indigo-400">
        {label}
      </label>
      <div className="flex h-[58px] items-center rounded-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-5 focus-within:border-blue-500 dark:focus-within:border-indigo-500">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 border-0 bg-transparent text-[15px] text-slate-900 dark:text-white outline-none"
        />
        <button
          type="button"
          onClick={onToggle}
          className="text-slate-700 dark:text-slate-400 transition hover:text-slate-900 dark:hover:text-white"
        >
          {visible ? (
            <EyeOff className="h-6 w-6" />
          ) : (
            <Eye className="h-6 w-6" />
          )}
        </button>
      </div>
    </div>
  );
};
