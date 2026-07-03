"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  createClientChangeRequest,
  downloadClientChangeRequestAttachment,
  getClientChangeRequests,
  getClientProjects,
} from "../services/api";
import { Icons } from "../constants";

const API_TO_UI_STATUS = {
  PENDING: "Pending",
  ACCEPTED: "Approved",
  REJECTED: "Rejected",
};

const STATUS_STYLES = {
  Pending: "border-amber-200 bg-amber-50 text-amber-700",
  Approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Rejected: "border-rose-200 bg-rose-50 text-rose-700",
};

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-100";

const shortId = (id) => {
  if (!id) return "-";
  return `${String(id).slice(0, 4)}...`;
};

const formatDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString();
};

const mapCrFromApi = (cr, projects = []) => {
  const matchedProject = projects.find((p) => p.id === cr.projectId);

  return {
    id: cr.id,
    displayId: cr.id,
    projectId: cr.projectId,
    projectName:
      matchedProject?.name ||
      matchedProject?.title ||
      cr.projectId ||
      "Unknown Project",
    title: cr.title || "Untitled",
    description: cr.description || "",
    status: API_TO_UI_STATUS[cr.status] || cr.status || "Pending",
    budget: Number(cr.budget || 0),
    timeline: cr.timeline || "-",
    createdAt: formatDate(cr.createdAt),
    priority: cr.priority || "Medium",
    rejectionReason: cr.rejectionReason || "",
    attachmentId: cr.attachmentId || null,
    attachmentName: cr.attachmentName || "",
    attachmentContentType: cr.attachmentContentType || "",
    attachmentSize: cr.attachmentSize || null,
    attachmentUploadedAt: formatDate(cr.attachmentUploadedAt),
  };
};

const downloadCR = (cr) => {
  const content = `CHANGE REQUEST
ID: ${cr.displayId}
Title: ${cr.title}
Project: ${cr.projectName}
Status: ${cr.status}
Budget: $${cr.budget}
Timeline: ${cr.timeline}
Priority: ${cr.priority}
Description: ${cr.description}
Rejection Reason: ${cr.rejectionReason || "-"}
Attachment: ${cr.attachmentName || "-"}`;

  const element = document.createElement("a");
  element.setAttribute(
    "href",
    `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`
  );
  element.setAttribute("download", `${cr.displayId || "change-request"}.txt`);
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

const FormField = ({ label, children }) => (
  <div>
    <label className="mb-2 block text-sm font-black text-slate-700">
      {label}
    </label>
    {children}
  </div>
);

const InfoCard = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
      {label}
    </p>
    <p className="mt-2 text-xl font-black text-slate-900">{value}</p>
  </div>
);

const ModalOverlay = ({ children, onClose }) => (
  <div
    className="fixed inset-x-0 bottom-0 top-[92px] z-40 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md lg:left-[256px]"
    onClick={onClose}
  >
    {children}
  </div>
);

const CRViewerModal = ({ cr, onClose }) => {
  if (!cr) return null;

  return (
    <ModalOverlay onClose={onClose}>
      <div
        className="flex h-[86vh] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] bg-white shadow-[0_30px_100px_rgba(15,23,42,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 bg-gradient-to-r from-indigo-700 via-violet-700 to-purple-700 px-8 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-white">{cr.title}</h2>
              <p className="mt-2 text-sm font-semibold text-indigo-100">
                {shortId(cr.displayId)} • {cr.projectName}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-white/15 px-3 py-1.5 text-lg font-black text-white transition hover:bg-white/25"
            >
              ×
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoCard label="Status" value={cr.status} />
            <InfoCard
              label="Budget"
              value={`$${Number(cr.budget || 0).toLocaleString()}`}
            />
            <InfoCard label="Timeline" value={cr.timeline} />
            <InfoCard label="Priority" value={cr.priority} />
          </div>

          <div className="rounded-3xl border border-slate-100 bg-slate-50 p-6">
            <h3 className="mb-3 text-lg font-black text-slate-950">
              Description
            </h3>
            <p className="text-sm font-semibold leading-7 text-slate-600">
              {cr.description || "-"}
            </p>
          </div>

          {cr.status === "Rejected" && cr.rejectionReason && (
            <div className="rounded-3xl border border-rose-100 bg-rose-50 p-6">
              <h3 className="mb-3 text-lg font-black text-rose-700">
                Rejection Reason
              </h3>
              <p className="text-sm font-semibold leading-7 text-rose-600">
                {cr.rejectionReason}
              </p>
            </div>
          )}

          {cr.attachmentId && (
            <div className="rounded-3xl border border-violet-100 bg-violet-50 p-6">
              <h3 className="mb-3 text-lg font-black text-violet-700">
                Attachment
              </h3>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {cr.attachmentName || "Attached file"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {cr.attachmentUploadedAt || "-"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const downloaded = await downloadClientChangeRequestAttachment(
                        cr.id,
                        cr.attachmentName || undefined
                      );

                      if (!downloaded) {
                        alert("Attachment not found");
                      }
                    } catch (downloadError) {
                      console.error(downloadError);
                      alert(
                        downloadError?.message || "Failed to download attachment"
                      );
                    }
                  }}
                  className="rounded-2xl bg-violet-700 px-4 py-3 text-sm font-black text-white transition hover:bg-violet-800"
                >
                  Download Attachment
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-white px-8 py-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => downloadCR(cr)}
              className="rounded-2xl bg-slate-950 py-4 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-violet-700"
            >
              Download
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl bg-slate-100 py-4 text-sm font-black text-slate-700 transition hover:bg-slate-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
};

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const AddCRModal = ({ projects, onClose, onAdd, isSubmitting, error }) => {
  const [formData, setFormData] = useState({
    projectId: "",
    title: "",
    description: "",
    budget: "",
    timeline: "",
    priority: "Medium",
    attachmentFile: null,
  });
  const [fileError, setFileError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setFileError("");

    if (file && file.size > MAX_FILE_SIZE_BYTES) {
      setFileError(`Attached file must be less than ${MAX_FILE_SIZE_MB}MB. Selected file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`);
      e.target.value = "";
      return;
    }

    setFormData((prev) => ({
      ...prev,
      attachmentFile: file,
    }));
  };

  const clearAttachment = () => {
    setFileError("");
    setFormData((prev) => ({
      ...prev,
      attachmentFile: null,
    }));
  };

  const selectedAttachmentName = formData.attachmentFile?.name || "No file selected";

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.projectId) {
      alert("Please select a project");
      return;
    }

    const success = await onAdd(formData);
    if (success) onClose();
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div
        className="flex h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.38)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 bg-gradient-to-r from-slate-950 via-indigo-950 to-violet-900 px-8 py-3 text-white">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-[22px] font-black tracking-tight text-white sm:text-[26px]">
                Raise New Change Request
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-lg font-black text-white transition hover:bg-white/20"
              aria-label="Close change request form"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 px-8 py-7">
            <div className="space-y-6">
              <FormField label="Project *">
                <select
                  name="projectId"
                  required
                  value={formData.projectId}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="">-- Select Project --</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name || project.title || project.id}
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.4fr_0.8fr]">
                <FormField label="Title *">
                  <input
                    type="text"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="e.g., Add dark mode support"
                  />
                </FormField>

                <FormField label="Priority">
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </FormField>
              </div>

              <FormField label="Description *">
                <textarea
                  name="description"
                  required
                  value={formData.description}
                  onChange={handleChange}
                  className={`${inputClass} min-h-36 resize-none`}
                  placeholder="Explain what should change, why it matters, and any important details..."
                />
              </FormField>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <FormField label="Budget ($)">
                  <input
                    type="number"
                    name="budget"
                    value={formData.budget}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="2000"
                  />
                </FormField>

                <FormField label="Timeline">
                  <input
                    type="text"
                    name="timeline"
                    value={formData.timeline}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="e.g., 2 weeks"
                  />
                </FormField>
              </div>

              <FormField label={`Attachment (max ${MAX_FILE_SIZE_MB}MB)`}>
                <div className={`rounded-2xl border bg-white p-4 shadow-sm transition ${fileError ? "border-amber-300" : "border-slate-200"}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-slate-950 px-4 py-2.5 text-xs font-black text-white transition hover:bg-violet-700">
                      Choose file
                      <input
                        type="file"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>

                    {formData.attachmentFile && (
                      <button
                        type="button"
                        onClick={clearAttachment}
                        className="self-start rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-black text-rose-600 transition hover:bg-rose-100 sm:self-auto"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="truncate text-sm font-bold text-slate-800">
                      {selectedAttachmentName}
                    </p>

                    {formData.attachmentFile && (
                      <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">
                        {(formData.attachmentFile.size / 1024).toFixed(1)} KB
                      </span>
                    )}
                  </div>

                  {fileError && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <span className="mt-0.5 text-amber-500">⚠</span>
                      <p className="text-xs font-bold text-amber-700">{fileError}</p>
                    </div>
                  )}
                </div>
              </FormField>

              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-bold text-rose-600">
                  {error}
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white px-8 py-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-2xl bg-slate-950 py-4 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Submitting..." : "Submit Change Request"}
              </button>

              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-2xl border border-slate-200 bg-white py-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
};

const ChangeRequests = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCR, setSelectedCR] = useState(null);
  const [crs, setCrs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filterStatus, setFilterStatus] = useState("All");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProjectsAndRequests();
  }, []);

  const fetchProjectsAndRequests = async () => {
    setIsLoading(true);
    setError("");

    try {
      const [projectsData, crData] = await Promise.all([
        getClientProjects(),
        getClientChangeRequests(),
      ]);

      const safeProjects = Array.isArray(projectsData) ? projectsData : [];
      const safeCRs = Array.isArray(crData) ? crData : [];

      setProjects(safeProjects);
      setCrs(safeCRs.map((cr) => mapCrFromApi(cr, safeProjects)));
    } catch (err) {
      console.error(err);
      setError(err.message || "Some change requests could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCR = async (formData) => {
    setIsSubmitting(true);
    setError("");

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        budget: formData.budget ? Number(formData.budget) : null,
        timeline: formData.timeline.trim(),
        priority: formData.priority,
        attachmentFile: formData.attachmentFile,
      };

      const saved = await createClientChangeRequest(formData.projectId, payload);
      const newCR = mapCrFromApi(saved, projects);

      setCrs((prev) => [newCR, ...prev]);
      return true;
    } catch (err) {
      console.error(err);
      const raw = err.message || "";
      if (raw.includes("413") || raw.toLowerCase().includes("too large") || raw.toLowerCase().includes("entity")) {
        setError(`File is too large. Please attach a file smaller than ${MAX_FILE_SIZE_MB}MB.`);
      } else {
        setError("Failed to submit change request. Please try again.");
      }
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCRs = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();

    return crs.filter((cr) => {
      const matchesSearch =
        cr.title.toLowerCase().includes(normalizedTerm) ||
        cr.projectName.toLowerCase().includes(normalizedTerm) ||
        cr.createdAt.toLowerCase().includes(normalizedTerm) ||
        String(cr.id).toLowerCase().includes(normalizedTerm);

      const matchesStatus =
        filterStatus === "All" || cr.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [crs, filterStatus, searchTerm]);

  return (
    <div className="relative z-10 space-y-7 px-2 pb-10 sm:px-4">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <InfoCard label="Total Requests" value={crs.length} />
        <InfoCard
          label="Pending"
          value={crs.filter((cr) => cr.status === "Pending").length}
        />
        <InfoCard
          label="Approved"
          value={crs.filter((cr) => cr.status === "Approved").length}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-[28px] border border-white bg-white/95 p-5 shadow-[0_20px_55px_rgba(15,23,42,0.08)]">
        <div className="relative min-w-[240px] flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-5 text-slate-400">
            <Icons.Search />
          </div>

          <input
            type="text"
            className="block w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-14 pr-5 text-sm font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
            placeholder="Search change requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-black text-slate-700 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
        >
          <option>All</option>
          <option>Approved</option>
          <option>Pending</option>
          <option>Rejected</option>
        </select>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="rounded-2xl bg-slate-950 px-6 py-4 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-violet-700"
        >
          + Raise CR
        </button>
      </div>

      {(isLoading || error) && (
        <div className="rounded-2xl border border-white bg-white/95 px-6 py-4 shadow-sm">
          {isLoading && (
            <p className="font-bold text-slate-600">
              Loading change requests...
            </p>
          )}
          {!isLoading && error && (
            <p className="font-bold text-rose-600">{error}</p>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-[32px] border border-white bg-white/95 shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="bg-slate-50">
              <tr>
                <TableHead>ID / Date</TableHead>
                <TableHead>Title & Project</TableHead>
                <TableHead center>Status</TableHead>
                <TableHead right>Budget</TableHead>
                <TableHead center>View</TableHead>
                <TableHead center>Download</TableHead>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredCRs.length > 0 ? (
                filteredCRs.map((cr) => (
                  <tr key={cr.id} className="transition hover:bg-violet-50/60">
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <span
                          className="cursor-help text-sm font-black text-slate-900"
                          title={cr.displayId}
                        >
                          {shortId(cr.displayId)}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          {cr.createdAt}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-black text-slate-900">
                          {cr.title}
                        </span>
                        <span className="text-xs font-black uppercase tracking-wide text-violet-600">
                          {cr.projectName}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-5 text-center">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-black ${
                          STATUS_STYLES[cr.status] ||
                          "border-slate-200 bg-slate-50 text-slate-600"
                        }`}
                      >
                        {cr.status}
                      </span>
                    </td>

                    <td className="px-6 py-5 text-right">
                      <span className="text-base font-black text-slate-900">
                        ${Number(cr.budget || 0).toLocaleString()}
                      </span>
                    </td>

                    <td className="px-6 py-5 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedCR(cr)}
                        className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-violet-700"
                      >
                        View
                      </button>
                    </td>

                    <td className="px-6 py-5 text-center">
                      <button
                        type="button"
                        onClick={() => downloadCR(cr)}
                        className="rounded-full bg-violet-50 px-4 py-2 text-xs font-black text-violet-700 transition hover:bg-violet-100"
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-8 py-16 text-center text-lg font-black text-slate-400"
                  >
                    No change requests found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCR && (
        <CRViewerModal cr={selectedCR} onClose={() => setSelectedCR(null)} />
      )}

      {showAddModal && (
        <AddCRModal
          projects={projects}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddCR}
          isSubmitting={isSubmitting}
          error={error}
        />
      )}
    </div>
  );
};
const TableHead = ({ children, center = false, right = false }) => (
  <th
    className={`px-6 py-5 text-xs font-black uppercase tracking-[0.18em] text-slate-400 ${
      center ? "text-center" : right ? "text-right" : "text-left"
    }`}
  >
    {children}
  </th>
);

export default ChangeRequests;