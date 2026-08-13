"use client";

import React, { useEffect, useMemo, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8080/api";

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

  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json")
    ? response.json()
    : response.text();
}

export default function AuditTrailSection({
  auditRequests = [],
  onOpenReview,
}) {
  const [requests, setRequests] = useState(auditRequests);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [reviewItem, setReviewItem] = useState(null);
  const [decision, setDecision] = useState("ACCEPTED");
  const [decisionReason, setDecisionReason] = useState("");

  const projectOptions = useMemo(() => {
    return [...new Set(requests.map((r) => r.projectId).filter(Boolean))];
  }, [requests]);

  async function loadCompanyRequests(projectId = "") {
    setLoading(true);
    setError("");

    try {
      const path = projectId
        ? `/company/projects/${encodeURIComponent(projectId)}/change-requests`
        : "/company/change-requests";

      const data = await apiRequest(path, { method: "GET" });
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load audit trail data");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCompanyRequests("");
  }, []);

  async function handleDownload(item) {
    try {
      const response = await fetch(
        `${API_BASE}/company/change-requests/${encodeURIComponent(
          item.id
        )}/download`,
        {
          method: "GET",
          headers: { ...getAuthHeaders() },
        }
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = `change-request-${item.id}.txt`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Failed to download change request");
    }
  }

  const mappedRows = requests.map((item) => ({
    ...item,
    viewStatus: item.status || "-",
    submittedDate: item.createdAt
      ? new Date(item.createdAt).toLocaleDateString()
      : "-",
  }));

  return (
    <div className="relative z-10 space-y-8 px-2 pb-10 sm:px-4">
      

      <div className="flex flex-wrap gap-4 rounded-[28px] border border-white bg-white/95 p-5 shadow-[0_20px_55px_rgba(15,23,42,0.08)]">
        <select
          value={projectFilter}
          onChange={(e) => {
            const next = e.target.value;
            setProjectFilter(next);
            loadCompanyRequests(next);
          }}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-black text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
        >
          <option value="">All projects</option>
          {projectOptions.map((projectId) => (
            <option key={projectId} value={projectId}>
              {projectId}
            </option>
          ))}
        </select>

        <select className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-black text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100">
          <option>Sort by date: Newest</option>
        </select>

        <select className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-black text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100">
          <option>Sort by name: Newest</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-[32px] border border-white bg-white/95 shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">
              Review Queue
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {mappedRows.length} request{mappedRows.length === 1 ? "" : "s"}{" "}
              available
            </p>
          </div>
        </div>

        {loading && (
          <div className="px-6 py-12 text-center text-sm font-bold text-slate-500">
            Loading audit trail...
          </div>
        )}

        {!loading && error && (
          <div className="mx-6 my-5 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700">
            {error}
          </div>
        )}

        {!loading && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="bg-slate-50">
                <tr>
                  <TableHead>Project ID</TableHead>
                  <TableHead>Client ID</TableHead>
                  <TableHead center>Status</TableHead>
                  <TableHead center>Actions</TableHead>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {mappedRows.length > 0 ? (
                  mappedRows.map((item) => (
                    <tr
                      key={item.id}
                      className="transition hover:bg-indigo-50/40"
                    >
                      <td className="px-6 py-5 text-sm font-black text-slate-900">
                        {item.projectId || "-"}
                      </td>

                      <td className="px-6 py-5 text-sm font-semibold text-slate-600">
                        {item.clientId || "-"}
                      </td>

                      <td className="px-6 py-5 text-center">
                        <StatusBadge status={item.viewStatus} />
                      </td>

                      <td className="px-6 py-5 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setReviewItem(item);
                            setDecision(
                              item.status === "REJECTED"
                                ? "REJECTED"
                                : "ACCEPTED"
                            );
                            setDecisionReason(
                              item.decisionReason ||
                                item.rejectionReason ||
                                ""
                            );
                            onOpenReview?.(item);
                          }}
                          className="rounded-full bg-slate-950 px-5 py-2.5 text-xs font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-600"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-8 py-16 text-center text-sm font-black text-slate-400"
                    >
                      No change requests available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-5">
          <PageBtn>{"<"}</PageBtn>
          <PageBtn active>1</PageBtn>
          <PageBtn>2</PageBtn>
          <PageBtn>3</PageBtn>
          <PageBtn>4</PageBtn>
          <span className="self-center px-2 text-sm font-bold text-slate-400">
            ...
          </span>
          <PageBtn>40</PageBtn>
          <PageBtn>{">"}</PageBtn>
        </div>
      </div>

      {reviewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl">
            <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-6 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-black">
                    Change Request Review
                  </h3>
                  <p className="mt-2 break-all text-sm font-medium text-white/80">
                    {reviewItem.crid || reviewItem.id} for{" "}
                    {reviewItem.projectId || "-"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setReviewItem(null)}
                  className="rounded-2xl bg-white/15 px-4 py-2 text-sm font-black text-white transition hover:bg-white/25"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6 sm:px-8">
              <div className="grid gap-4 rounded-[28px] border border-slate-100 bg-slate-50/90 p-5 sm:grid-cols-2 lg:grid-cols-3">
                <InfoCard label="Project ID" value={reviewItem.projectId} />
                <InfoCard label="PRD ID" value={reviewItem.prdId} />
                <InfoCard label="Client ID" value={reviewItem.clientId} />
                <InfoCard label="Change Request ID" value={reviewItem.id} />
                <InfoCard label="Status" value={reviewItem.status} />
                <InfoCard label="Submitted" value={reviewItem.submittedDate} />
              </div>

              <div className="rounded-[28px] border border-slate-100 bg-slate-50/90 p-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Summary
                </p>
                <h4 className="mt-2 break-words text-xl font-black text-slate-950">
                  {reviewItem.title || "-"}
                </h4>
                <p className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap break-words pr-1 text-sm font-medium leading-6 text-slate-600">
                  {reviewItem.description || "-"}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleDownload(reviewItem)}
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-indigo-600"
                >
                  Download client submission
                </button>

                <button
                  type="button"
                  onClick={() => setDecision("ACCEPTED")}
                  className={`rounded-2xl border px-5 py-3 text-sm font-black transition ${
                    decision === "ACCEPTED"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Accept
                </button>

                <button
                  type="button"
                  onClick={() => setDecision("REJECTED")}
                  className={`rounded-2xl border px-5 py-3 text-sm font-black transition ${
                    decision === "REJECTED"
                      ? "border-rose-300 bg-rose-50 text-rose-700"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Reject
                </button>
              </div>

              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  Reason sent to client
                </label>
                <textarea
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  className="min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  placeholder="Write the reason for accepting or rejecting the change request..."
                />
              </div>

              <div className="sticky bottom-0 -mx-6 flex justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4 shadow-[0_-6px_20px_rgba(0,0,0,0.04)] sm:-mx-8 sm:px-8">
                <button
                  type="button"
                  onClick={() => setReviewItem(null)}
                  className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await apiRequest(
                        `/company/change-requests/${encodeURIComponent(
                          reviewItem.id
                        )}/decision`,
                        {
                          method: "PATCH",
                          body: JSON.stringify({
                            accepted: decision === "ACCEPTED",
                            decisionReason,
                            rejectionReason:
                              decision === "REJECTED"
                                ? decisionReason
                                : null,
                          }),
                        }
                      );

                      setReviewItem(null);
                      await loadCompanyRequests(projectFilter);
                    } catch (err) {
                      setError(err.message || "Failed to submit decision");
                    }
                  }}
                  className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Submit Decision
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const value = String(status || "").toUpperCase();

  const className =
    value === "ACCEPTED"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : value === "REJECTED"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-black uppercase ${className}`}
    >
      {status || "-"}
    </span>
  );
}

function PageBtn({ children, active = false }) {
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

function InfoCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-black text-slate-800">
        {value || "-"}
      </p>
    </div>
  );
}