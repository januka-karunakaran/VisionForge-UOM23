"use client";

import React, { useEffect, useMemo, useState } from "react";
import { cn } from "../utils/cn.js";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080/api";

function getAuthHeaders() {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("crms_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  return response.json();
}

export default function VersionHistorySection({ versions = [] }) {
  const [rows, setRows] = useState(versions);
  const [searchProjectId, setSearchProjectId] = useState("");
  const [entries, setEntries] = useState([]);
  const [activeRow, setActiveRow] = useState(null);
  const [loadingRows, setLoadingRows] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRows() {
      setLoadingRows(true);
      setError("");
      try {
        const data = await apiRequest("/company/version-history", { method: "GET" });
        setRows(Array.isArray(data) ? data : []);
      } catch (err) {
        setRows([]);
        setError(err.message || "Failed to load version history");
      } finally {
        setLoadingRows(false);
      }
    }

    loadRows();
  }, []);

  async function viewHistory(row) {
    setActiveRow(row);
    setLoadingEntries(true);
    setError("");
    try {
      const data = await apiRequest(
        `/company/version-history/projects/${encodeURIComponent(row.projectId)}/prds/${encodeURIComponent(row.prdId || "-")}`,
        { method: "GET" }
      );
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      setEntries([]);
      setError(err.message || "Failed to load selected history entries");
    } finally {
      setLoadingEntries(false);
    }
  }

  const detailRows = useMemo(
    () =>
      entries.map((entry, index) => ({
        version: entry.implementedVersion || `1.${index + 1}`,
        date: entry.updatedAt ? new Date(entry.updatedAt).toLocaleDateString() : "-",
        description: entry.implementationNotes || entry.description || "-",
        author: entry.clientId || "-",
        reviewer: "Company",
        approval: entry.status === "REJECTED" ? "Rejected" : "Approved",
        title: entry.title || "-",
        decisionReason: entry.decisionReason || "-",
        rejectionReason: entry.rejectionReason || "-",
        createdAt: entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "-",
        decidedAt: entry.decidedAt ? new Date(entry.decidedAt).toLocaleString() : "-",
        implementedAt: entry.implementedAt ? new Date(entry.implementedAt).toLocaleString() : "-",
      })),
    [entries]
  );

  const filteredRows = useMemo(() => {
    const query = searchProjectId.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((row) => String(row.projectId || "").toLowerCase().includes(query));
  }, [rows, searchProjectId]);

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Version History</h2>

        {!!error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <div className="mb-4">
          <label htmlFor="version-history-project-search" className="block text-sm font-semibold text-gray-700 mb-2">
            Search by Project ID
          </label>
          <input
            id="version-history-project-search"
            type="text"
            value={searchProjectId}
            onChange={(e) => setSearchProjectId(e.target.value)}
            placeholder="Paste project ID here"
            className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div className="overflow-x-auto mb-10">
          {loadingRows && <p className="text-sm text-gray-500">Loading version history table...</p>}
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-400 text-sm uppercase tracking-wider border-b border-gray-50">
                <th className="pb-6 px-4">Project ID</th>
                <th className="pb-6 px-4">PRD ID</th>
                <th className="pb-6 px-4">Client ID</th>
                <th className="pb-6 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {!loadingRows && filteredRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 px-4 text-center text-sm text-gray-500">
                    No matching project found.
                  </td>
                </tr>
              )}

              {filteredRows.map((row, idx) => (
                <tr key={`${row.projectId}-${row.prdId}-${idx}`} className="border-b border-gray-50">
                  <td className="py-4 px-4 text-gray-700 font-semibold">{row.projectId || "-"}</td>
                  <td className="py-4 px-4 text-gray-700 font-semibold">{row.prdId || "-"}</td>
                  <td className="py-4 px-4 text-gray-700 font-semibold">{row.clientId || "-"}</td>
                  <td className="py-4 px-4 text-center">
                    <button
                      onClick={() => viewHistory(row)}
                       className="rounded-full bg-slate-950 px-5 py-2.5 text-xs font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-600"
                        >
                    
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-bold text-gray-800 mb-4">
          Select a row to open the full version history popup
        </h3>

        {activeRow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3 py-4 sm:px-4 sm:py-6">
            <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-2xl border border-gray-100">
              <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-5 border-b border-gray-100">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-bold text-gray-800">Version History</h3>
                   
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveRow(null);
                      setEntries([]);
                    }}
                    className="rounded-full px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-6">
                {loadingEntries && <p className="text-sm text-gray-500">Loading selected history...</p>}

                <div className="rounded-2xl bg-[#FAFBFF] p-4 sm:p-5 border border-gray-100">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <HistoryMeta label="Project ID" value={activeRow.projectId} />
                    <HistoryMeta label="PRD ID" value={activeRow.prdId || "-"} />
                    <HistoryMeta label="Client ID" value={activeRow.clientId || "-"} />
                    <HistoryMeta label="Current History Count" value={detailRows.length} />
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <p className="text-sm text-gray-500 mt-1">
                      Each version shows what changed, when it was decided, and the exact note saved for that edit.
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-gray-400 text-xs uppercase tracking-wider border-b border-gray-50 bg-[#FAFBFF]">
                          <th className="pb-4 pt-4 px-4">Version</th>
                          <th className="pb-4 pt-4 px-4">Date</th>
                          <th className="pb-4 pt-4 px-4">What changed</th>
                          <th className="pb-4 pt-4 px-4">Decision reason</th>
                          <th className="pb-4 pt-4 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailRows.length === 0 && !loadingEntries && (
                          <tr>
                            <td colSpan={5} className="py-8 px-4 text-center text-sm text-gray-500">
                              No version history found for this project/PRD.
                            </td>
                          </tr>
                        )}

                        {detailRows.map((version, idx) => (
                          <tr key={idx} className="border-b border-gray-50 align-top">
                            <td className="py-4 px-4 font-semibold text-gray-700 whitespace-nowrap">
                              {idx === 0 ? "1.1" : version.version}
                            </td>
                            <td className="py-4 px-4 text-gray-600 whitespace-nowrap">{version.date}</td>
                            <td className="py-4 px-4 text-gray-700 max-w-xl">
                              <div className="font-semibold text-gray-800 break-words">{version.title}</div>
                              <div className="mt-1 text-sm text-gray-600 whitespace-pre-wrap break-words">
                                {version.description}
                              </div>
                              <div className="mt-2 grid gap-2 text-xs text-gray-500 sm:grid-cols-2">
                                <div>Created: {version.createdAt}</div>
                                <div>Decided: {version.decidedAt}</div>
                                <div>Implemented: {version.implementedAt}</div>
                                <div>Reviewed by: {version.reviewer}</div>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-gray-600 max-w-lg whitespace-pre-wrap break-words">
                              {version.decisionReason !== "-" ? version.decisionReason : version.rejectionReason}
                            </td>
                            <td className="py-4 px-4">
                              <span
                                className={cn(
                                  "text-sm font-semibold",
                                  version.approval === "Approved"
                                    ? "text-emerald-600"
                                    : "text-amber-600"
                                )}
                              >
                                {version.approval}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HistoryMeta({ label, value }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 border border-gray-100 shadow-sm">
      <div className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">{label}</div>
      <div className="mt-1 text-sm font-semibold text-gray-800 break-words">{value || "-"}</div>
    </div>
  );
}