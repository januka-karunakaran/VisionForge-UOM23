"use client";

import React, { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  LayoutDashboard,
  Plus,
  Search,
} from "lucide-react";
import { cn } from "../utils/cn.js";

export default function DashboardSection({ projects = [], onCreate = () => {} }) {
  const [searchTerm, setSearchTerm] = useState("");

  const stats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter(
      (p) => (p.status || "").toUpperCase() === "ACTIVE"
    ).length;

    const updated = projects.filter((p) => {
      const date = p.lastUpdated || p.updatedAt;
      if (!date) return false;
      return new Date(date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }).length;

    return { total, active, updated };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return [...projects]
      .filter((p) => {
        if (!term) return true;

        return (
          String(p.title || p.name || "").toLowerCase().includes(term) ||
          String(p.clientName || "").toLowerCase().includes(term) ||
          String(p.status || "").toLowerCase().includes(term)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.lastUpdated || b.updatedAt || 0) -
          new Date(a.lastUpdated || a.updatedAt || 0)
      );
  }, [projects, searchTerm]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7 px-4 py-8">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
        <Card
          title="Total Projects"
          value={stats.total}
          icon={<LayoutDashboard className="h-5 w-5" />}
        />
        <Card
          title="Active Projects"
          value={stats.active}
          icon={<FileText className="h-5 w-5" />}
        />
        <Card
          title="Updated This Week"
          value={stats.updated}
          icon={<Clock className="h-5 w-5" />}
        />

        <button
          type="button"
          onClick={onCreate}
          className="flex min-h-[116px] items-center justify-center gap-3 rounded-[28px] bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 text-sm font-black text-white shadow-[0_20px_55px_rgba(79,70,229,0.25)] transition hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(79,70,229,0.35)]"
        >
          <Plus className="h-5 w-5" />
          Create Proposal
        </button>
      </div>

      <div className="overflow-hidden rounded-[32px] border border-white bg-white/95 shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">
              Recent Activity
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {filteredProjects.length} project
              {filteredProjects.length === 1 ? "" : "s"} found
            </p>
          </div>

          <div className="relative w-full md:w-[360px]">
            <Search
              className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search project, client, status..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead className="bg-slate-50">
              <tr>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Updated</TableHead>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredProjects.length > 0 ? (
                filteredProjects.map((p, i) => (
                  <tr key={p.id || i} className="transition hover:bg-indigo-50/40">
                    <td className="px-6 py-5 text-sm font-black text-slate-900">
                      {p.title || p.name || "-"}
                    </td>

                    <td className="px-6 py-5">
                      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black uppercase text-emerald-700">
                        {p.status || "ACTIVE"}
                      </span>
                    </td>

                    <td className="max-w-[280px] px-6 py-5 text-sm font-semibold text-slate-600">
                      <div className="truncate">{p.clientName || "-"}</div>
                    </td>

                    <td className="px-6 py-5 text-sm font-semibold text-slate-500">
                      {formatDate(p.lastUpdated || p.updatedAt)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-8 py-16 text-center text-sm font-black text-slate-400"
                  >
                    No recent project activity found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-5">
          <PageBtn>
            <ChevronLeft size={16} />
          </PageBtn>
          <PageBtn active>1</PageBtn>
          <PageBtn>2</PageBtn>
          <PageBtn>3</PageBtn>
          <PageBtn>
            <ChevronRight size={16} />
          </PageBtn>
        </div>
      </div>
    </div>
  );
}

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const Card = ({ title, value, icon }) => (
  <div className="group relative overflow-hidden rounded-[28px] border border-white bg-white p-6 shadow-[0_20px_55px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
    <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-indigo-500/10 transition group-hover:scale-125" />

    <div className="relative flex items-center gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
        {icon}
      </div>

      <div>
        <p className="text-sm font-bold text-slate-400">{title}</p>
        <p className="mt-1 text-3xl font-black text-slate-950">{value}</p>
      </div>
    </div>
  </div>
);

const TableHead = ({ children }) => (
  <th className="px-6 py-5 text-left text-xs font-black uppercase tracking-[0.18em] text-slate-400">
    {children}
  </th>
);

const PageBtn = ({ children, active }) => (
  <button
    type="button"
    className={cn(
      "flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black transition",
      active
        ? "bg-indigo-600 text-white shadow-lg"
        : "bg-slate-100 text-slate-400 hover:bg-slate-200"
    )}
  >
    {children}
  </button>
);