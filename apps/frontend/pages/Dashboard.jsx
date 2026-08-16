// FULL UPDATED PREMIUM DASHBOARD

import React, { useEffect, useMemo, useState } from "react";
import { Icons } from "../constants";
import {
  getClientDashboard,
  getCompanyDashboard,
  getClientChangeRequests,
} from "../services/api";
import { getUser, normalizeRole as authNormalizeRole } from "../utils/auth";

const normalizeRole = (rawRole) => {
  if (!rawRole) return "";
  const role = String(rawRole).trim().toUpperCase();
  if (role === "ROLE_CLIENT") return "CLIENT";
  if (role === "ROLE_COMPANY") return "COMPANY";
  return role;
};

const Dashboard = ({ user: initialUser, role: initialRole }) => {
  const [user, setUser] = useState(initialUser || null);
  const [role, setRole] = useState(initialRole || "");

  useEffect(() => {
    if (!user || !role) {
      const storedUser = getUser();
      const storedRole = localStorage.getItem("crms_role") || (storedUser?.role);
      
      if (storedUser && !user) setUser(storedUser);
      if (storedRole && !role) setRole(storedRole);
    }
  }, [initialUser, initialRole]);

  const resolvedRole = normalizeRole(role || initialRole);
  const isCompany = resolvedRole === "COMPANY";

  const [dashboardData, setDashboardData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, [resolvedRole]);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const data =
        resolvedRole === "COMPANY"
          ? await getCompanyDashboard()
          : await getClientDashboard();

      setDashboardData(data || {});
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="p-10 text-xl font-bold text-slate-500 dark:text-slate-400">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-10">
      
      {/* HERO */}
      <div className="rounded-[28px] bg-gradient-to-r from-indigo-600 to-violet-600 p-8 text-white shadow-xl">
        <h2 className="text-3xl font-black">
          Welcome, {user?.fullName || user?.name || user?.email || "User"} 👋
        </h2>
        <p className="opacity-90 mt-2">
          {isCompany
            ? "Manage projects, proposals and delivery"
            : "Track your projects and requests"}
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isCompany ? (
          <>
            <StatCard title="Total Projects" value={dashboardData.totalProjects} />
            <StatCard title="Active Projects" value={dashboardData.activeProjects} />
            <StatCard title="Accepted Proposals" value={dashboardData.acceptedProposals} />
            <StatCard title="Pending Approvals" value={dashboardData.pendingApprovals} />
          </>
        ) : (
          <>
            <StatCard title="Accepted Projects" value={dashboardData.acceptedProjectsCount} />
            <StatCard title="Pending Proposals" value={dashboardData.pendingProposalsCount} />
            <StatCard title="Pending CRs" value={dashboardData.pendingChangeRequestsCount} />
            <StatCard title="Approved CRs" value={dashboardData.approvedChangeRequestsCount} />
          </>
        )}
      </div>

      {/* CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow dark:shadow-slate-900">
          <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">
            {isCompany ? "Recent Projects" : "Recent Proposals"}
          </h3>

          <div className="space-y-4">
            {(isCompany ? dashboardData.recentProjects : (dashboardData.recentProposals || dashboardData.recentProjects) || []).map((item, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
              >
                <h4 className="font-bold text-slate-900 dark:text-white">{item.name || item.projectName || item.title}</h4>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {item.description || "No description"}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow dark:shadow-slate-900">
          <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Overview</h3>

          <div className="space-y-4">
            <ProgressItem label="Progress" value={dashboardData.progress || 0} />
            <ProgressItem label="Completion" value={dashboardData.completion || 0} />
          </div>

          <button className="w-full mt-6 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700">
            Download Report
          </button>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value }) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow hover:shadow-lg transition dark:shadow-slate-900">
    <p className="text-gray-500 dark:text-slate-400 text-sm">{title}</p>
    <p className="text-3xl font-black mt-2 text-slate-900 dark:text-white">{value || 0}</p>
  </div>
);

const ProgressItem = ({ label, value }) => (
  <div>
    <div className="flex justify-between text-sm font-bold mb-1 text-slate-700 dark:text-slate-300">
      <span>{label}</span>
      <span>{value}%</span>
    </div>
    <div className="w-full bg-gray-200 dark:bg-slate-700 h-2 rounded-full">
      <div
        className="bg-indigo-600 h-2 rounded-full"
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
);

export default Dashboard;