"use client";

import React, { useMemo, useState } from "react";
import { acceptProposal, rejectProposal } from "@/services/api";

const fallbackProject = {
  id: "N/A",
  title: "No proposal selected",
  clientId: "Not assigned",
  clientName: "",
  companyId: "",
  description: "No proposal was selected.",
  status: "PENDING",
  totalBudget: null,
  totalDurationDays: null,
  budgetData: [],
  timelines: [],
};

function normalizeStatus(status) {
  return String(status || "PENDING").trim().toUpperCase();
}

function getStatusColor(status) {
  switch (normalizeStatus(status)) {
    case "ACCEPTED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "REJECTED":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "OVERDUE":
      return "bg-orange-50 text-orange-700 border-orange-200";
    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
}

function formatCurrency(value) {
  if (value === null || value === undefined || value === "") return "-";
  const amount = Number(value);
  if (Number.isNaN(amount)) return String(value);
  return `$${amount.toFixed(2)}`;
}

function buildBudgetRows(project, projectBudgetData) {
  if (Array.isArray(projectBudgetData) && projectBudgetData.length > 0) {
    return projectBudgetData;
  }

  if (Array.isArray(project.budgetData) && project.budgetData.length > 0) {
    return project.budgetData;
  }

  if (project.totalBudget !== null && project.totalBudget !== undefined) {
    return [
      {
        item: "Total Budget",
        unit: "-",
        qty: "-",
        unitCost: "-",
        total: project.totalBudget,
      },
    ];
  }

  return [];
}

function buildTimelineRows(project, projectTimelineData) {
  if (Array.isArray(projectTimelineData) && projectTimelineData.length > 0) {
    return projectTimelineData;
  }

  if (Array.isArray(project.timelines) && project.timelines.length > 0) {
    return project.timelines;
  }

  if (
    project.totalDurationDays !== null &&
    project.totalDurationDays !== undefined
  ) {
    return [
      {
        phase: "Overall Delivery",
        startDate: "-",
        endDate: "-",
        duration: `${project.totalDurationDays} days`,
        assignedTo: "-",
      },
    ];
  }

  return [];
}

export default function ProposalDetailsSection({
  selectedProject,
  onBack = () => {},
  detailsView = null,
  setDetailsView = () => {},
  projectBudgetData = [],
  projectTimelineData = [],
  clientId = null,
  companyId = null,
  onProposalUpdate = () => {},
}) {
  const project = selectedProject || fallbackProject;
  const isFallbackProject = !selectedProject;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  const budgetRows = useMemo(
    () => buildBudgetRows(project, projectBudgetData),
    [project, projectBudgetData]
  );

  const timelineRows = useMemo(
    () => buildTimelineRows(project, projectTimelineData),
    [project, projectTimelineData]
  );

  const submittedDate = project.submittedAt
    ? project.submittedAt
    : project.createdAt
      ? new Date(project.createdAt).toLocaleDateString()
      : "-";

  const updatedDate = project.updatedAt
    ? new Date(project.updatedAt).toLocaleDateString()
    : submittedDate;

  const handleAccept = async () => {
    if (!clientId || !project.id || companyId) return;

    setLoading(true);
    setError(null);

    try {
      const updatedProposal = await acceptProposal(project.id);
      onProposalUpdate(updatedProposal);
      alert("Proposal accepted successfully!");
    } catch (err) {
      setError(err.message || "Failed to accept proposal");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!clientId || !project.id || companyId) return;

    if (!rejectionReason.trim()) {
      setError("Please provide a rejection reason");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updatedProposal = await rejectProposal(
        project.id,
        rejectionReason.trim()
      );
      onProposalUpdate(updatedProposal);
      setShowRejectModal(false);
      setRejectionReason("");
      alert("Proposal rejected successfully!");
    } catch (err) {
      setError(err.message || "Failed to reject proposal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8">

          <button
            type="button"
            onClick={onBack}
            className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-indigo-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-50"
          >
            Back to Proposals
          </button>


      {isFallbackProject && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-700">
          Open this page from the proposals list to view a specific proposal.
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-[32px] border border-white bg-white/95 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl">
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-950">
              {project.title}
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-500">
              {project.description}
            </p>
          </div>

          {!isFallbackProject &&
            !companyId &&
            (normalizeStatus(project.status) === "PENDING" ||
              normalizeStatus(project.status) === "OVERDUE") && (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={loading}
                  className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:bg-slate-300"
                >
                  {loading ? "Processing..." : "Accept Proposal"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowRejectModal(true)}
                  disabled={loading}
                  className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-rose-700 disabled:bg-slate-300"
                >
                  {loading ? "Processing..." : "Reject Proposal"}
                </button>
              </div>
            )}
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <InfoCard label="Proposal ID" value={project.id} />
          <InfoCard
            label="Client"
            value={project.clientName || project.clientId || project.client || "-"}
          />
          <InfoCard label="Company ID" value={project.companyId || "-"} />
          <InfoCard label="Submitted Date" value={submittedDate} />
          <InfoCard label="Last Updated" value={updatedDate} />
          <InfoCard
            label="Status"
            value={normalizeStatus(project.status)}
            valueClassName={`inline-flex rounded-full border px-4 py-2 text-sm font-black ${getStatusColor(
              project.status
            )}`}
          />
          <InfoCard label="Total Budget" value={formatCurrency(project.totalBudget)} />
          <InfoCard
            label="Total Duration"
            value={
              project.totalDurationDays !== null &&
              project.totalDurationDays !== undefined
                ? `${project.totalDurationDays} days`
                : "-"
            }
          />
          {project.rejectionReason &&
            normalizeStatus(project.status) === "REJECTED" && (
              <InfoCard
                label="Rejection Reason"
                value={project.rejectionReason}
                valueClassName="font-bold text-rose-700"
              />
            )}
        </div>
      </div>

      <div className="rounded-[28px] border border-white bg-white/95 p-6 shadow-[0_20px_55px_rgba(15,23,42,0.08)]">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setDetailsView("budget")}
            className={`rounded-2xl px-5 py-4 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 ${
              detailsView === "budget"
                ? "bg-gradient-to-r from-indigo-700 to-violet-700"
                : "bg-gradient-to-r from-indigo-600 to-violet-600"
            }`}
          >
            Estimated Budget
          </button>

          <button
            type="button"
            onClick={() => setDetailsView("timeline")}
            className={`rounded-2xl px-5 py-4 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 ${
              detailsView === "timeline"
                ? "bg-gradient-to-r from-indigo-700 to-violet-700"
                : "bg-gradient-to-r from-indigo-600 to-violet-600"
            }`}
          >
            Estimated Timeline
          </button>
        </div>
      </div>

      {detailsView === "budget" && (
        <SectionCard title="Estimated Budget">
          <ReadOnlyTable
            headers={["Item", "Unit", "Qty", "Unit Cost", "Total"]}
            rows={budgetRows}
            emptyMessage="No budget details available."
            renderRow={(row, idx) => (
              <tr key={`${row.item || "budget"}-${idx}`} className="hover:bg-slate-50">
                <TableCell>{row.item || "-"}</TableCell>
                <TableCell>{row.unit || "-"}</TableCell>
                <TableCell>{row.qty ?? row.quantity ?? "-"}</TableCell>
                <TableCell>
                  {(row.unitCost ?? row.unitPrice) && (row.unitCost ?? row.unitPrice) !== "-"
                    ? formatCurrency(row.unitCost ?? row.unitPrice)
                    : "-"}
                </TableCell>
                <TableCell>{formatCurrency(row.total)}</TableCell>
              </tr>
            )}
          />
          <BackRow onBack={() => setDetailsView(null)} />
        </SectionCard>
      )}

      {detailsView === "timeline" && (
        <SectionCard title="Estimated Timeline">
          <ReadOnlyTable
            headers={[
              "Phase",
              "Start Date",
              "End Date",
              "Duration",
              "Assigned To",
            ]}
            rows={timelineRows}
            emptyMessage="No timeline details available."
            renderRow={(row, idx) => (
              <tr key={`${row.phase || "timeline"}-${idx}`} className="hover:bg-slate-50">
                <TableCell>{row.phase || "-"}</TableCell>
                <TableCell>{row.startDate || "-"}</TableCell>
                <TableCell>{row.endDate || "-"}</TableCell>
                <TableCell>{row.duration || "-"}</TableCell>
                <TableCell>{row.assignedTo || "-"}</TableCell>
              </tr>
            )}
          />
          <BackRow onBack={() => setDetailsView(null)} />
        </SectionCard>
      )}

      {detailsView === null && (
        <div className="rounded-[28px] border border-white bg-white/95 p-8 shadow-[0_20px_55px_rgba(15,23,42,0.08)]">
          <h2 className="text-xl font-black text-slate-950">Overview</h2>
          <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">
            Use the buttons above to view the submitted budget and timeline
            details for this proposal.
          </p>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] bg-white p-7 shadow-2xl">
            <h3 className="text-xl font-black text-slate-950">
              Reject Proposal
            </h3>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Please provide a reason for rejecting this proposal.
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="mt-5 w-full rounded-2xl border border-slate-200 p-4 text-sm outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
              rows="4"
            />

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason("");
                }}
                className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRejectSubmit}
                disabled={loading || !rejectionReason.trim()}
                className="flex-1 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-black text-white transition hover:bg-rose-700 disabled:bg-slate-300"
              >
                {loading ? "Processing..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({
  label,
  value,
  valueClassName = "font-black text-slate-800",
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/90 p-5 transition hover:bg-white hover:shadow-md">
      <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className={valueClassName}>{value}</p>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="rounded-[28px] border border-white bg-white/95 p-8 shadow-[0_20px_55px_rgba(15,23,42,0.08)]">
      <h2 className="mb-6 text-xl font-black text-slate-950">{title}</h2>
      {children}
    </div>
  );
}

function ReadOnlyTable({ headers, rows, renderRow, emptyMessage }) {
  return (
    <div className="mb-6 overflow-x-auto rounded-2xl border border-slate-100">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50">
            {headers.map((header) => (
              <th
                key={header}
                className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-400"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {rows.length > 0 ? (
            rows.map(renderRow)
          ) : (
            <tr>
              <td
                colSpan={headers.length}
                className="p-8 text-center text-sm font-bold text-slate-400"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function BackRow({ onBack }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200"
    >
      Back
    </button>
  );
}

function TableCell({ children }) {
  return <td className="px-4 py-4 font-semibold text-slate-700">{children}</td>;
}
