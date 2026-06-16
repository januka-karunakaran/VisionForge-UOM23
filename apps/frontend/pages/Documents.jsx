import React, { useEffect, useMemo, useState } from "react";
import {
  getClientProjects,
  getClientProjectPrd,
  getCompanyProjects,
  fetchPrds,
  downloadDocument,
} from "../services/api";

const Documents = ({ user = null, role = null }) => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [prdData, setPrdData] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingPrd, setLoadingPrd] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoadingProjects(true);
      setError("");
      let data = [];

      if (String(role || "").toUpperCase() === "COMPANY") {
        // Company users should fetch company projects
        const companyId = user?.id || localStorage.getItem("companyId");
        data = await getCompanyProjects(companyId);
      } else {
        // Default to client projects
        data = await getClientProjects();
      }

      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to fetch client projects");
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleProjectChange = async (projectId) => {
    setSelectedProjectId(projectId);
    setPrdData(null);
    setError("");

    if (!projectId) return;

    try {
      setLoadingPrd(true);
      if (String(role || "").toUpperCase() === "COMPANY") {
        // Company users: fetch PRDs list and pick the first (or show none)
        const list = await fetchPrds(projectId);
        if (Array.isArray(list) && list.length > 0) {
          setPrdData(list[0]);
        } else {
          setError("No PRD available for this project yet");
        }
      } else {
        // Client users: single PRD endpoint
        const data = await getClientProjectPrd(projectId);
        if (data) setPrdData(data);
        else setError("No PRD available for this project yet");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to fetch PRD");
    } finally {
      setLoadingPrd(false);
    }
  };

  const handleDownload = async () => {
    if (!prdData?.id) {
      alert("No document to download");
      return;
    }

    try {
      setError("");
      const { blob, fileName: contentDisposition, contentType } = await downloadDocument(
        prdData.id
      );

      if (!blob || blob.size === 0) {
        throw new Error("Received empty file from server");
      }

      // Determine filename preference: server-provided -> prdData.fileName -> fallback
      let downloadFileName = contentDisposition || prdData.fileName || "prd-document";

      // If server returned a decoded filename (our API tries to), use it directly.
      // Ensure proper extension based on content type when missing.
      if (!downloadFileName.includes(".")) {
        if (contentType && contentType.includes("pdf")) {
          downloadFileName += ".pdf";
        } else if (contentType && contentType.startsWith("text/")) {
          downloadFileName += ".txt";
        } else {
          downloadFileName += ".pdf";
        }
      }

      let finalBlob = blob;

      // If the server returned text content but it appears as a blob with unknown charset,
      // read it as text (UTF-8) and re-create a utf-8 text blob so characters render correctly.
      try {
        if (contentType && contentType.startsWith("text/")) {
          const text = await blob.text();
          finalBlob = new Blob([text], { type: "text/plain;charset=utf-8" });
        }
      } catch (e) {
        console.warn("Failed to normalize text blob encoding:", e);
      }

      const url = window.URL.createObjectURL(finalBlob);
      const link = document.createElement("a");

      link.href = url;
      link.download = downloadFileName;
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (err) {
      console.error("Download error:", err);
      setError(err.message || "Failed to download PRD. Please try again.");
    }
  };

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId),
    [projects, selectedProjectId]
  );

  if (loadingProjects) {
    return (
      <div className="rounded-[28px] border border-blue-200 bg-blue-50 p-8 text-center shadow-sm">
        <p className="text-lg font-black text-blue-800">
          Loading client projects...
        </p>
      </div>
    );
  }

  return (
    <div className="relative z-10 space-y-8 px-2 pb-10 sm:px-4">

      <div className="rounded-[28px] border border-white bg-white/95 p-6 shadow-[0_20px_55px_rgba(15,23,42,0.08)]">
        <label className="mb-3 block text-sm font-black text-slate-700">
          Select Project
        </label>

        <select
          value={selectedProjectId}
          onChange={(e) => handleProjectChange(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
        >
          <option value="">-- Choose a project --</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name || project.title || project.id}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700">
          {error}
        </div>
      )}

      {loadingPrd && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-bold text-blue-700">
          Loading PRD...
        </div>
      )}

      {selectedProject && !loadingPrd && (
        <div className="rounded-[28px] border border-white bg-white/95 p-6 shadow-[0_20px_55px_rgba(15,23,42,0.08)]">
          <h2 className="mb-5 text-xl font-black text-slate-950">
            Selected Project
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <DetailCard
              label="Project Name"
              value={selectedProject.name || selectedProject.title || "-"}
            />
            <DetailCard label="Project ID" value={selectedProject.id || "-"} />
          </div>
        </div>
      )}

      {prdData && !loadingPrd && (
        <div className="space-y-6 rounded-[32px] border border-white bg-white/95 p-7 shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.22em] text-indigo-600">
                PRD Details
              </p>
              <h2 className="text-2xl font-black text-slate-950">
                {prdData.fileName || "PRD Document"}
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Client view for uploaded PRD.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownload}
              className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              Download PRD
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <DetailCard label="Document Name" value={prdData.fileName || "-"} />
            <DetailCard label="Document ID" value={prdData.id || "-"} />
            <DetailCard label="File Type" value={prdData.fileType || "PRD"} />
            <DetailCard
              label="Uploaded Date"
              value={
                prdData.uploadedAt
                  ? new Date(prdData.uploadedAt).toLocaleDateString()
                  : "-"
              }
            />
          </div>

          {prdData.fileUrl ? (
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 shadow-inner">
              <iframe
                src={prdData.fileUrl}
                title="PRD Preview"
                className="h-[600px] w-full"
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-700">
              Preview not available. Please use download.
            </div>
          )}
        </div>
      )}

      {!selectedProjectId && !loadingPrd && (
        <div className="rounded-[28px] border border-dashed border-slate-200 bg-white/80 p-10 text-center">
          <p className="text-sm font-bold text-slate-400">
            Select a project to view PRD document details.
          </p>
        </div>
      )}
    </div>
  );
};

const DetailCard = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-100 bg-slate-50/90 p-5 transition hover:bg-white hover:shadow-md">
    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
      {label}
    </p>
    <p className="mt-3 break-words text-sm font-black text-slate-900">
      {value}
    </p>
  </div>
);

export default Documents;