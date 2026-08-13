"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Eye, FileText, Plus } from "lucide-react";

export default function ProposalsListSection({
  projects = [],
  onCreate = () => {},
  onSelect = () => {},
}) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8">

          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-indigo-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-50"
          >
            <Plus className="h-4 w-4" />
            Create Proposal
          </button>

      <div className="overflow-hidden rounded-[32px] border border-white bg-white/95 shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl">
        <div className="flex items-center gap-4 border-b border-slate-100 px-6 py-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-950">
              Created Project Proposals
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {projects.length} proposal{projects.length === 1 ? "" : "s"}{" "}
              available
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left">
            <thead className="bg-slate-50">
              <tr>
                <TableHead>PID</TableHead>
                <TableHead>Proposal Name</TableHead>
                <TableHead>Client ID</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead center>Actions</TableHead>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {projects.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-8 py-16 text-center text-lg font-black text-slate-400"
                  >
                    No proposals available yet.
                  </td>
                </tr>
              ) : (
                projects.map((proj) => (
                  <tr
                    key={proj.id || proj.title}
                    className="transition hover:bg-indigo-50/40"
                  >
                    <td
                      className="px-6 py-5 text-sm font-black text-slate-900"
                      title={proj.id}
                    >
                      {String(proj.id || "-").length > 14
                        ? `${String(proj.id).substring(0, 14)}...`
                        : proj.id || "-"}
                    </td>

                    <td
                      className="max-w-[260px] px-6 py-5 text-sm font-bold text-slate-700"
                      title={proj.title}
                    >
                      <div className="truncate">{proj.title || "-"}</div>
                    </td>

                    <td
                      className="max-w-[240px] px-6 py-5 text-sm font-semibold text-slate-600"
                      title={proj.client}
                    >
                      <div className="truncate">
                        {proj.client || "Not assigned"}
                      </div>
                    </td>

                    <td className="px-6 py-5 text-sm font-semibold text-slate-600">
                      {proj.budget || "-"}
                    </td>

                    <td className="px-6 py-5 text-sm font-semibold text-slate-600">
                      {proj.duration || "-"}
                    </td>

                    <td className="px-6 py-5 text-center">
                      <button
                        type="button"
                        onClick={() => onSelect(proj)}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-600"
                      >
                        <Eye className="h-4 w-4" />
                        View More
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-center gap-2 border-t border-slate-100 px-6 py-5">
          <PageButton>
            <ChevronLeft size={16} />
          </PageButton>
          <PageButton active>1</PageButton>
          <PageButton>2</PageButton>
          <PageButton>3</PageButton>
          <PageButton>4</PageButton>
          <span className="self-center px-2 text-sm font-bold text-slate-400">
            ...
          </span>
          <PageButton>40</PageButton>
          <PageButton>
            <ChevronRight size={16} />
          </PageButton>
        </div>
      </div>
    </div>
  );
}

function TableHead({ children, center = false }) {
  return (
    <th
      className={`px-6 py-5 text-xs font-black uppercase tracking-[0.18em] text-slate-400 ${
        center ? "text-center" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function PageButton({ children, active = false }) {
  return (
    <button
      type="button"
      className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black transition ${
        active
          ? "bg-indigo-600 text-white shadow-lg"
          : "bg-slate-100 text-slate-400 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}