"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileEdit,
  FileText,
  History,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "../utils/cn.js";
import { createPrd, fetchPrds, getCompanyProjects } from "@/services/api";
import { getToken } from "@/utils/auth";

const emptyStakeholder = () => ({ role: "", name: "", responsibility: "" });

const emptyMilestone = () => ({
  phase: "",
  task: "",
  duration: "",
  responsibility: "",
});

const createEmptyForm = () => ({
  projectId: "",
  projectName: "",
  author: "",
  dateSubmitted: "",
  purpose: "",
  problemToSolve: "",
  projectGoal: "",
  stakeholders: [emptyStakeholder()],
  inScope: "",
  outOfScope: "",
  mainFeatures: "",
  functionalRequirement: "",
  nonFunctionalRequirement: "",
  userRoles: "",
  risksDependencies: "",
  milestones: [emptyMilestone()],
});

const hasText = (value) => String(value || "").trim().length > 0;

const editorFieldClass = (value, extraClassName = "") =>
  cn(
    "prd-editor-input",
    !hasText(value) && "prd-editor-input--empty",
    extraClassName
  );

const countFilledValues = (values) => values.filter(hasText).length;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderMarkdown(text) {
  if (!text) return "";
  const escaped = escapeHtml(text);
  const lines = escaped.split(/\r?\n/);
  let html = "";
  let inList = false;
  let para = "";

  for (let rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith("- ")) {
      if (para) {
        html += `<p>${para}</p>`;
        para = "";
      }

      if (!inList) {
        inList = true;
        html += "<ul>";
      }

      const item = line.slice(2);
      html += `<li>${item}</li>`;
    } else if (line === "") {
      if (para) {
        html += `<p>${para}</p>`;
        para = "";
      }
      if (inList) {
        html += "</ul>";
        inList = false;
      }
    } else {
      if (inList) {
        html += "</ul>";
        inList = false;
      }
      para = para ? para + " " + line : line;
    }
  }

  if (inList) html += "</ul>";
  if (para) html += `<p>${para}</p>`;

  // simple inline formatting: **bold** and *italic*
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  return html;
}

const getProjectId = (project) => project?.id || project?._id || "";

function validateForm(form) {
  const scalarFields = [
    form.projectId,
    form.projectName,
    form.author,
    form.dateSubmitted,
    form.purpose,
    form.problemToSolve,
    form.projectGoal,
    form.inScope,
    form.outOfScope,
    form.mainFeatures,
    form.functionalRequirement,
    form.nonFunctionalRequirement,
    form.userRoles,
    form.risksDependencies,
  ];

  if (!scalarFields.every(hasText)) return false;

  const validStakeholders =
    form.stakeholders.length > 0 &&
    form.stakeholders.every(
      (item) =>
        hasText(item.role) &&
        hasText(item.name) &&
        hasText(item.responsibility)
    );

  const validMilestones =
    form.milestones.length > 0 &&
    form.milestones.every(
      (item) =>
        hasText(item.phase) &&
        hasText(item.task) &&
        hasText(item.duration) &&
        hasText(item.responsibility)
    );

  return validStakeholders && validMilestones;
}

function normalizePrd(prd, project) {
  return {
    ...prd,
    id: prd?.id || prd?._id || prd?.prdId || project?.prdId || project?.id,
    projectId: prd?.projectId || project?.id || project?._id,
    title:
      prd?.title ||
      prd?.projectName ||
      project?.name ||
      project?.title ||
      "Untitled PRD",
    status: prd?.status || "IN REVIEW",
    createdDate:
      prd?.createdDate ||
      prd?.createdAt ||
      prd?.dateSubmitted ||
      prd?.lastModified ||
      "-",
  };
}

function PrdRepositorySectionView({
  prdList = [],
  searchQuery = "",
  onSearchChange = () => {},
  onCreate = () => {},
  onReview = () => {},
  isLoading = false,
}) {
  const inReviewCount = prdList.filter((item) =>
    String(item.status || "").toLowerCase().includes("review")
  ).length;

  const StatCard = ({ label, value, icon: Icon, color }) => (
    <div className="flex min-w-[200px] flex-1 items-center gap-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className={cn("rounded-2xl p-3", color)}>
        <Icon size={24} className="text-white" />
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
          {label}
        </p>
        <p className="text-3xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-6">
        <StatCard
          label="Total PRDs"
          value={prdList.length}
          icon={FileText}
          color="bg-green-500"
        />
        <StatCard
          label="PRDs in review"
          value={inReviewCount}
          icon={FileEdit}
          color="bg-orange-400"
        />
        <StatCard
          label="Avg. Review Time"
          value="4d"
          icon={History}
          color="bg-blue-400"
        />

        <button
          type="button"
          onClick={onCreate}
          className="flex items-center gap-2 rounded-2xl bg-[#000080] px-8 py-4 font-semibold text-white shadow-lg shadow-blue-900/20 transition-all hover:bg-blue-900"
        >
          <Plus size={20} />
          Create New PRD
        </button>
      </div>

      <div className="rounded-[2rem] border border-gray-100 bg-white p-8 shadow-sm">
        <div className="relative mb-8">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"
            size={20}
          />

          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            className="w-full rounded-xl border-none bg-[#F8F9FE] py-4 pl-12 pr-4 transition-all focus:ring-2 focus:ring-[#5D57A3]/20"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-50 text-sm uppercase tracking-wider text-gray-400">
                <th className="px-4 pb-4 font-semibold">Project ID</th>
                <th className="px-4 pb-4 font-semibold">Title</th>
                <th className="px-4 pb-4 font-semibold">Status</th>
                <th className="px-4 pb-4 font-semibold">Created Date</th>
                <th className="pb-4 text-center font-semibold">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {isLoading && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    Loading PRDs...
                  </td>
                </tr>
              )}

              {!isLoading && prdList.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    No PRDs found. Create your first PRD.
                  </td>
                </tr>
              )}

              {!isLoading &&
                prdList.map((prd, index) => (
                  <tr
                    key={prd.id || `${prd.projectId}-${index}`}
                    className="group transition-colors hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-6 font-bold text-gray-700">
                      {prd.projectId || "-"}
                    </td>

                    <td className="max-w-xs px-4 py-6 font-bold text-gray-800">
                      {prd.title}
                    </td>

                    <td className="px-4 py-6">
                      <span className="font-medium text-gray-800">
                        {prd.status}
                      </span>
                    </td>

                    <td className="px-4 py-6 font-medium text-gray-500">
                      {prd.createdDate}
                    </td>

                    <td className="px-4 py-6">
                      <div className="flex justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => onReview(prd)}
                          className="rounded-xl bg-black px-6 py-2 text-sm font-bold text-white shadow-md transition-all duration-300 hover:scale-105 hover:bg-gradient-to-r hover:from-indigo-600 hover:to-violet-600 hover:shadow-[0_10px_30px_rgba(99,102,241,0.45)]"
                        >
                          Review
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function CompanyPrdRepositorySection() {
  const router = useRouter();

  const [prdList, setPrdList] = useState([]);
  const [companyProjects, setCompanyProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(createEmptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");

  // Check if PRD is empty/incomplete (should not be displayed)
  const isPrdEmpty = (prd) => {
    if (!prd) return true;
    const fields = [
      prd.author,
      prd.purpose,
      prd.problemToSolve,
      prd.projectGoal,
      prd.inScope,
      prd.outOfScope,
      prd.mainFeatures,
      prd.functionalRequirement,
      prd.nonFunctionalRequirement,
      prd.userRoles,
      prd.risksDependencies,
    ];

    // Check if any critical field is missing
    if (fields.some((field) => !field || String(field).trim() === "" || String(field) === "-")) {
      return true;
    }

    // Check if stakeholders or milestones are missing
    if (!prd.stakeholders || prd.stakeholders.length === 0) return true;
    if (!prd.milestones || prd.milestones.length === 0) return true;

    return false;
  };

  const loadProjectsAndPrds = async () => {
    const token = getToken();
    if (!token) return;

    try {
      setIsLoading(true);

      const projects = await getCompanyProjects();
      const projectList = Array.isArray(projects) ? projects : [];

      const activeProjects = projectList.filter(
        (project) => String(project.status || "").toUpperCase() === "ACTIVE"
      );

      setCompanyProjects(activeProjects);

      const projectMap = new Map(
        activeProjects.map((project) => [String(getProjectId(project)), project])
      );
      const allPrds = await fetchPrds();
      const prdsByProject = new Map();

      // Filter out empty/incomplete PRDs - only show PRDs with complete information
      (Array.isArray(allPrds) ? allPrds : [])
        .map((prd) =>
          normalizePrd(prd, projectMap.get(String(prd?.projectId || "")))
        )
        .filter((prd) => !isPrdEmpty(prd))
        .forEach((prd) => {
          const key = String(prd.projectId || prd.id || "");

          if (key && !prdsByProject.has(key)) {
            prdsByProject.set(key, prd);
          }
        });

      setPrdList(Array.from(prdsByProject.values()));
    } catch (error) {
      console.error("Failed to load PRDs:", error);
      setPrdList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjectsAndPrds();
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;

    const loadProjects = async () => {
      const token = getToken();
      if (!token) return;

      try {
        setIsLoadingProjects(true);

        const projects = await getCompanyProjects();
        const acceptedProjects = Array.isArray(projects)
          ? projects.filter(
              (project) =>
                String(project.status || "").toUpperCase() === "ACTIVE"
            )
          : [];
        const existingPrds = await fetchPrds();
        const projectIdsWithPrds = new Set(
          (Array.isArray(existingPrds) ? existingPrds : [])
            .map((prd) => String(prd?.projectId || ""))
            .filter(Boolean)
        );

        setCompanyProjects(
          acceptedProjects.filter(
            (project) => !projectIdsWithPrds.has(String(getProjectId(project)))
          )
        );
      } catch (error) {
        console.error("Failed to load projects:", error);
        setCompanyProjects([]);
      } finally {
        setIsLoadingProjects(false);
      }
    };

    loadProjects();
  }, [isModalOpen]);

  const filteredPrds = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) return prdList;

    return prdList.filter((prd) =>
      [prd.projectId, prd.title, prd.status, prd.createdDate]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [prdList, searchQuery]);

  const resetForm = () => {
    setForm(createEmptyForm());
    setErrorMessage("");
  };

  const applyProjectSelection = (projectId) => {
    const selectedProject = companyProjects.find(
      (project) => String(getProjectId(project)) === String(projectId)
    );

    setForm((prev) => ({
      ...prev,
      projectId: getProjectId(selectedProject),
      projectName: selectedProject?.name || selectedProject?.title || "",
      author:
        selectedProject?.clientId ||
        selectedProject?.clientName ||
        selectedProject?.author ||
        "",
    }));

    if (!selectedProject && projectId) {
      setErrorMessage("Selected project is not available.");
    } else {
      setErrorMessage("");
    }
  };

  const openCreateModal = () => {
    setSubmitMessage("");
    setIsModalOpen(true);
    resetForm();

    const token = getToken();

    if (!token) {
      setErrorMessage("Please log in again to load PRDs.");
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const updateField = (field) => (event) => {
    setForm((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));

    setErrorMessage("");
  };

  const updateStakeholder = (index, field) => (event) => {
    const value = event.target.value;

    setForm((prev) => {
      const next = [...prev.stakeholders];
      next[index] = {
        ...next[index],
        [field]: value,
      };

      return { ...prev, stakeholders: next };
    });

    setErrorMessage("");
  };

  const addStakeholder = () => {
    setForm((prev) => ({
      ...prev,
      stakeholders: [...prev.stakeholders, emptyStakeholder()],
    }));
  };

  const removeStakeholder = (index) => {
    setForm((prev) => {
      if (prev.stakeholders.length === 1) return prev;

      return {
        ...prev,
        stakeholders: prev.stakeholders.filter(
          (_, itemIndex) => itemIndex !== index
        ),
      };
    });
  };

  const updateMilestone = (index, field) => (event) => {
    const value = event.target.value;

    setForm((prev) => {
      const next = [...prev.milestones];
      next[index] = {
        ...next[index],
        [field]: value,
      };

      return { ...prev, milestones: next };
    });

    setErrorMessage("");
  };

  const addMilestone = () => {
    setForm((prev) => ({
      ...prev,
      milestones: [...prev.milestones, emptyMilestone()],
    }));
  };

  const removeMilestone = (index) => {
    setForm((prev) => {
      if (prev.milestones.length === 1) return prev;

      return {
        ...prev,
        milestones: prev.milestones.filter(
          (_, itemIndex) => itemIndex !== index
        ),
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitMessage("");

    if (!validateForm(form)) {
      setErrorMessage(
        "Please fill every field, plus at least one stakeholder and one milestone."
      );
      return;
    }

    if (prdList.some((prd) => String(prd.projectId) === String(form.projectId))) {
      setErrorMessage("A PRD already exists for this project.");
      return;
    }

    const token = getToken();

    if (!token) {
      setErrorMessage("Please log in again before submitting.");
      return;
    }

    try {
      setIsSaving(true);

      const created = await createPrd(form.projectId, form);
      const normalizedCreated = normalizePrd(created, {
        id: form.projectId,
        name: form.projectName,
      });

      setPrdList((prev) => [normalizedCreated, ...prev]);
      setSubmitMessage("PRD submitted successfully.");
      closeModal();
      await loadProjectsAndPrds();
    } catch (error) {
      setErrorMessage(error.message || "Failed to submit PRD.");
    } finally {
      setIsSaving(false);
    }
  };

  const goToPrdDetails = (prd) => {
    const prdId = prd?.id || prd?._id || prd?.prdId;

    if (!prdId) {
      setErrorMessage("Selected PRD does not have an id.");
      return;
    }

    router.push(
      `/company/Prd-details&Editor?prdId=${encodeURIComponent(prdId)}`
    );
  };

  const editorCompletion = useMemo(() => {
    const coreFields = [
      form.projectId,
      form.projectName,
      form.author,
      form.dateSubmitted,
      form.purpose,
      form.problemToSolve,
      form.projectGoal,
      form.inScope,
      form.outOfScope,
      form.mainFeatures,
      form.functionalRequirement,
      form.nonFunctionalRequirement,
      form.userRoles,
      form.risksDependencies,
    ];

    const stakeholderFields = form.stakeholders.flatMap((item) => [
      item.role,
      item.name,
      item.responsibility,
    ]);

    const milestoneFields = form.milestones.flatMap((item) => [
      item.phase,
      item.task,
      item.duration,
      item.responsibility,
    ]);

    const total =
      coreFields.length + stakeholderFields.length + milestoneFields.length;
    const completed =
      countFilledValues(coreFields) +
      countFilledValues(stakeholderFields) +
      countFilledValues(milestoneFields);

    return {
      completed,
      total,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [form]);

  const documentSections = useMemo(
    () => [
      {
        label: "Basic Information",
        state:
          form.projectId && form.projectName && form.author && form.dateSubmitted
            ? "complete"
            : "missing",
      },
      {
        label: "Project Overview",
        state:
          form.purpose && form.problemToSolve && form.projectGoal
            ? "complete"
            : "missing",
      },
      {
        label: "Key Stakeholders",
        state: form.stakeholders.every(
          (item) => item.role && item.name && item.responsibility
        )
          ? "complete"
          : "missing",
      },
      {
        label: "Scope",
        state: form.inScope && form.outOfScope ? "complete" : "missing",
      },
      {
        label: "Requirements",
        state:
          form.mainFeatures &&
          form.functionalRequirement &&
          form.nonFunctionalRequirement
            ? "complete"
            : "missing",
      },
      {
        label: "Roles and Risks",
        state: form.userRoles && form.risksDependencies ? "complete" : "missing",
      },
      {
        label: "Timeline",
        state: form.milestones.every(
          (item) => item.phase && item.task && item.duration && item.responsibility
        )
          ? "complete"
          : "missing",
      },
    ],
    [form]
  );

  return (
    <>
      <PrdRepositorySectionView
        prdList={filteredPrds}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onCreate={openCreateModal}
        onReview={goToPrdDetails}
        isLoading={isLoading}
      />

      {submitMessage && (
        <p className="mt-3 text-sm font-medium text-green-600">
          {submitMessage}
        </p>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleSubmit}
            className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-3xl border border-slate-200 bg-[#F5F7FB] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-300 px-6 py-5">
              <h2 className="text-3xl font-extrabold text-[#1A1A40]">
                Create New PRD
              </h2>

              <button
                type="button"
                onClick={closeModal}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6 overflow-y-auto px-6 py-6">
              <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-[#F7F8FC] p-3 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1A1A40]">
                      Document editor
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-slate-900">
                      Create a structured PRD document.
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      The form behaves like a document canvas with section guidance.
                    </p>
                  </div>

                  <div className="min-w-[160px] text-right">
                    <p className="text-sm font-bold text-slate-900">
                      {editorCompletion.percent}% ready
                    </p>
                    <p className="text-xs text-slate-500">
                      {editorCompletion.completed} of {editorCompletion.total}{" "}
                      fields filled
                    </p>
                  </div>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#1A1A40] to-[#5D57A3] transition-all"
                    style={{ width: `${editorCompletion.percent}%` }}
                  />
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-2xl border border-slate-200 bg-white p-2">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                      Writing guidance
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                        Empty fields are highlighted
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        Use short sentences in long fields
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        Keep items specific and measurable
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-2 relative">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                      Document outline
                    </p>
                    <div className="mt-2 flex flex-col gap-2">
                      {documentSections.map((section) => (
                        <button
                          key={section.label}
                          onClick={() => {
                            const id = `section-${section.label
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, "-")}`;
                            const el = document.getElementById(id);
                            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                          className={cn(
                            "text-left rounded-md px-3 py-1 text-xs font-semibold w-full",
                            section.state === "complete"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          )}
                        >
                          {section.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <section id="section-basic-information" className="space-y-3 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
                <h3 id="section-Basic-Information" className="border-b border-slate-400 pb-2 text-lg font-bold text-slate-800">
                  Basic Information
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <select
                    className={editorFieldClass(form.projectId)}
                    value={form.projectId}
                    onChange={(event) =>
                      applyProjectSelection(event.target.value)
                    }
                  >
                    <option value="">Select accepted project</option>

                    {isLoadingProjects && (
                      <option value="">Loading projects...</option>
                    )}

                    {companyProjects.map((project) => {
                      const projectId = getProjectId(project);

                      return (
                        <option key={projectId} value={projectId}>
                          {project.name || project.title || projectId} (
                          {project.clientName ||
                            project.clientId ||
                            "No client"}
                          )
                        </option>
                      );
                    })}
                  </select>

                  <input
                    className={editorFieldClass(form.projectName)}
                    placeholder="Project Name"
                    value={form.projectName}
                    readOnly
                  />

                  <input
                    className={editorFieldClass(form.author)}
                    placeholder="Client ID"
                    value={form.author}
                    readOnly
                  />

                  <input
                    className={editorFieldClass(form.dateSubmitted)}
                    type="date"
                    value={form.dateSubmitted}
                    onChange={updateField("dateSubmitted")}
                  />
                </div>

                {companyProjects.length === 0 && !isLoadingProjects && (
                  <p className="text-sm font-medium text-amber-600">
                    No accepted projects found. Accept a proposal first, then
                    create PRD from that project.
                  </p>
                )}
              </section>

              <section id="section-project-overview" className="space-y-3 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
                <h3 id="section-Project-Overview" className="border-b border-slate-400 pb-2 text-lg font-bold text-slate-800">
                  Project Overview
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <input
                    className={editorFieldClass(form.purpose)}
                    placeholder="Purpose"
                    value={form.purpose}
                    onChange={updateField("purpose")}
                  />

                  <input
                    className={editorFieldClass(form.problemToSolve)}
                    placeholder="Problem to solve"
                    value={form.problemToSolve}
                    onChange={updateField("problemToSolve")}
                  />

                  <input
                    className={editorFieldClass(form.projectGoal)}
                    placeholder="Project Goal"
                    value={form.projectGoal}
                    onChange={updateField("projectGoal")}
                  />
                </div>
              </section>

              <section id="section-key-stakeholders" className="space-y-3 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-400 pb-2">
                  <h3 className="text-lg font-bold text-slate-800">
                    Key Stakeholders
                  </h3>

                  <button
                    type="button"
                    onClick={addStakeholder}
                    className="flex items-center gap-1 rounded-lg bg-[#1A1A40] px-3 py-2 text-sm font-semibold text-white"
                  >
                    <Plus size={16} /> Add Stakeholder
                  </button>
                </div>

                {form.stakeholders.map((item, index) => (
                  <div
                    key={`stakeholder-${index}`}
                    className="grid grid-cols-1 items-center gap-3 md:grid-cols-12"
                  >
                    <input
                      className={editorFieldClass(
                        item.role,
                        "md:col-span-3"
                      )}
                      placeholder="Role"
                      value={item.role}
                      onChange={updateStakeholder(index, "role")}
                    />

                    <input
                      className={editorFieldClass(
                        item.name,
                        "md:col-span-3"
                      )}
                      placeholder="Name"
                      value={item.name}
                      onChange={updateStakeholder(index, "name")}
                    />

                    <input
                      className={editorFieldClass(
                        item.responsibility,
                        "md:col-span-5"
                      )}
                      placeholder="Responsibility"
                      value={item.responsibility}
                      onChange={updateStakeholder(index, "responsibility")}
                    />

                    <button
                      type="button"
                      onClick={() => removeStakeholder(index)}
                      disabled={form.stakeholders.length === 1}
                      className="justify-self-end text-red-500 disabled:text-slate-300 md:col-span-1"
                      aria-label="Delete stakeholder"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </section>

              <section id="section-scope" className="space-y-3 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
                <h3 id="section-Scope" className="border-b border-slate-400 pb-2 text-lg font-bold text-slate-800">
                  Scope
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <textarea
                    className={editorFieldClass(form.inScope, "min-h-24")}
                    placeholder="In Scope"
                    value={form.inScope}
                    onChange={updateField("inScope")}
                  />

                  <textarea
                    className={editorFieldClass(form.outOfScope, "min-h-24")}
                    placeholder="Out of Scope"
                    value={form.outOfScope}
                    onChange={updateField("outOfScope")}
                  />
                </div>
              </section>

              <TextareaSection
                title="Main Features"
                value={form.mainFeatures}
                onChange={updateField("mainFeatures")}
                helperText="List the core features the PRD must include."
              />

              <TextareaSection
                title="Functional Requirement"
                value={form.functionalRequirement}
                onChange={updateField("functionalRequirement")}
                helperText="Capture what the system should do in clear statements."
              />

              <TextareaSection
                title="Non Functional Requirement"
                value={form.nonFunctionalRequirement}
                onChange={updateField("nonFunctionalRequirement")}
                helperText="Add performance, security, usability, or reliability needs."
              />

              <TextareaSection
                title="User Roles"
                value={form.userRoles}
                onChange={updateField("userRoles")}
                helperText="Mention every role that interacts with the project."
              />

              <TextareaSection
                title="Risk / Dependencies"
                value={form.risksDependencies}
                onChange={updateField("risksDependencies")}
                helperText="Write any blockers, external systems, or dependencies."
              />

              <section id="section-requirements" className="space-y-3 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-400 pb-2">
                  <h3 className="text-lg font-bold text-slate-800">
                    Timeline / Milestone
                  </h3>

                  <button
                    type="button"
                    onClick={addMilestone}
                    className="flex items-center gap-1 rounded-lg bg-[#1A1A40] px-3 py-2 text-sm font-semibold text-white"
                  >
                    <Plus size={16} /> Add Milestone
                  </button>
                </div>

                {form.milestones.map((item, index) => (
                  <div
                    key={`milestone-${index}`}
                    className="grid grid-cols-1 items-center gap-3 md:grid-cols-12"
                  >
                    <input
                      className={editorFieldClass(
                        item.phase,
                        "md:col-span-2"
                      )}
                      placeholder="Phase"
                      value={item.phase}
                      onChange={updateMilestone(index, "phase")}
                    />

                    <input
                      className={editorFieldClass(item.task, "md:col-span-4")}
                      placeholder="Task"
                      value={item.task}
                      onChange={updateMilestone(index, "task")}
                    />

                    <input
                      className={editorFieldClass(
                        item.duration,
                        "md:col-span-2"
                      )}
                      placeholder="Duration"
                      value={item.duration}
                      onChange={updateMilestone(index, "duration")}
                    />

                    <input
                      className={editorFieldClass(
                        item.responsibility,
                        "md:col-span-3"
                      )}
                      placeholder="Responsibility"
                      value={item.responsibility}
                      onChange={updateMilestone(index, "responsibility")}
                    />

                    <button
                      type="button"
                      onClick={() => removeMilestone(index)}
                      disabled={form.milestones.length === 1}
                      className="justify-self-end text-red-500 disabled:text-slate-300 md:col-span-1"
                      aria-label="Delete milestone"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </section>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-slate-300 bg-[#EEF1F7] px-6 py-4">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl bg-slate-400 px-7 py-3 font-semibold text-white hover:bg-slate-500"
              >
                Cancel
              </button>

              {errorMessage ? (
                <p className="flex-1 text-center text-sm font-semibold text-red-500">
                  {errorMessage}
                </p>
              ) : (
                <div className="flex-1" />
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-[#D6DDE8] px-7 py-3 font-bold text-[#4B5563] hover:bg-[#c6cedb] disabled:opacity-60"
              >
                {isSaving ? "Submitting..." : "Submit PRD"}
              </button>
            </div>
          </form>
        </div>
      )}

      <style jsx global>{`
        .prd-editor-input {
          width: 100%;
          border: 1px solid transparent;
          border-radius: 14px;
          font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
          font-size: 15px;
          padding: 14px 16px;
          padding: 12px 14px;
          background: linear-gradient(180deg, #dfe3ea 0%, #d8dee8 100%);
          color: #0f172a;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease,
            background 0.2s ease,
            transform 0.2s ease;
        }

        .prd-editor-input:focus {
          outline: 2px solid #1a1a40;
          outline-offset: 1px;
          background: #eef2f8;
          border-color: #1a1a40;
          transform: translateY(-1px);
        }

        .prd-editor-input--empty {
          border-color: rgba(245, 158, 11, 0.35);
          background: linear-gradient(180deg, #fff8eb 0%, #f1f4fb 100%);
          box-shadow: inset 0 0 0 1px rgba(251, 191, 36, 0.18);
        }

        .prd-editor-input--empty::placeholder {
          color: #9aa4b2;
          font-weight: 500;
        }

        .prd-editor-textarea {
          min-height: 6.5rem;
          line-height: 1.6;
          resize: vertical;
        }

        .prd-preview {
          min-height: 3.5rem;
          max-height: 12rem;
          overflow: auto;
          white-space: pre-wrap;
        }

        .prd-preview p {
          margin: 0 0 0.6rem 0;
        }

        .prd-preview ul {
          list-style: disc;
          list-style-position: outside;
          margin: 0.2rem 0 0.6rem 1.2rem;
          padding-left: 1rem;
        }
        .prd-preview li {
          margin: 0.15rem 0;
        }

        .toolbar-btn {
          display: inline-flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
          border-radius: 10px;
          background: #f1f5f9;
          padding: 8px 12px;
          font-weight: 700;
          border: 1px solid rgba(15, 23, 42, 0.04);
          cursor: pointer;
          min-width: 126px;
          text-align: left;
          transition:
            background 0.2s ease,
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .toolbar-btn:hover {
          background: #e6eefb;
          transform: translateY(-1px);
          box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
        }

        .toolbar-label {
          font-size: 0.92rem;
          line-height: 1.1;
          color: #0f172a;
        }

        .toolbar-hint {
          font-size: 0.72rem;
          font-weight: 500;
          color: #64748b;
        }
      `}</style>
    </>
  );
}

function TextareaSection({ title, value, onChange, helperText = "" }) {
  const ref = (0, require("react").useRef)(null);

  const applyWrap = (before, after = before) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value || "";
    const selected = text.slice(start, end) || "";
    const newText = text.slice(0, start) + before + selected + after + text.slice(end);
    onChange({ target: { value: newText } });

    // restore selection after update
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = start + before.length;
      el.selectionEnd = start + before.length + selected.length;
    });
  };

  const applyBullet = () => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value || "";
    const selected = text.slice(start, end) || "";

    if (!selected) {
      const newText = `${text.slice(0, start)}- ${text.slice(end)}`;
      onChange({ target: { value: newText } });

      requestAnimationFrame(() => {
        el.focus();
        el.selectionStart = start + 2;
        el.selectionEnd = start + 2;
      });
      return;
    }

    const lines = selected.split(/\r?\n/).map((l) => (l.trim() ? `- ${l}` : l));
    const newSelected = lines.join("\n");
    const newText = text.slice(0, start) + newSelected + text.slice(end);
    onChange({ target: { value: newText } });

    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = start;
      el.selectionEnd = start + newSelected.length;
    });
  };

  return (
    <section className="space-y-3 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
      <h3 className="text-sm font-extrabold uppercase text-slate-600">{title}</h3>
      {helperText && <p className="text-sm text-slate-500">{helperText}</p>}

      <div className="prd-toolbar mb-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => applyWrap("**", "**")}
          className="toolbar-btn"
          title="Bold selected text"
          aria-label="Bold selected text"
        >
          <span className="toolbar-label">Bold</span>
          <span className="toolbar-hint">Make text strong</span>
        </button>

        <button
          type="button"
          onClick={() => applyWrap("*", "*")}
          className="toolbar-btn"
          title="Italic selected text"
          aria-label="Italic selected text"
        >
          <span className="toolbar-label">Italic</span>
          <span className="toolbar-hint">Add emphasis</span>
        </button>

        <button
          type="button"
          onClick={applyBullet}
          className="toolbar-btn"
          title="Add bullet list"
          aria-label="Add bullet list"
        >
          <span className="toolbar-label">Bullet List</span>
          <span className="toolbar-hint">Turn lines into bullets</span>
        </button>
      </div>

      <textarea
        ref={ref}
        className={editorFieldClass(value, "prd-editor-textarea")}
        value={value}
        onChange={onChange}
      />

      <div className="mt-3">
        <p className="text-xs font-semibold text-slate-500 mb-2">Preview</p>
        <div
          className="prd-preview rounded-md border border-slate-100 bg-[#fbfdff] p-4 text-slate-800"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
        />
      </div>
    </section>
  );
}
