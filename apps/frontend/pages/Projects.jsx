"use client";

import React, { useState, useEffect } from "react";
import { Icons } from "../constants";

const Projects = () => {
  const [selectedProject, setSelectedProject] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("All Projects");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [projects, setProjects] = useState([]);
  const [activeTab, setActiveTab] = useState("changeRequests");

  const filters = [
    "All Projects",
    "Status: In Development",
    "Status: Testing",
    "Status: Requirements",
    "Progress: > 50%",
    "Progress: < 50%",
  ];

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/client/projects", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("crms_token")}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch projects");
      }

      const data = await res.json();

      const formattedProjects = data.map((p) => ({
        id: p.id,
        name: p.name || "N/A",
        status:
          p.status === "ACTIVE"
            ? "In Development"
            : p.status === "COMPLETED"
              ? "Testing"
              : p.status === "CANCELLED"
                ? "Requirements"
                : "In Development",
        progress: p.progress || 0,
        startDate: p.timeline || "N/A",
        manager: p.clientName || "N/A",
        budget: p.budget || 0,
        description: p.description || "No description available.",

        // Dynamic change requests from backend
        changeRequests: Array.isArray(p.changeRequests)
          ? p.changeRequests.map((cr, index) => ({
              id: cr.id || `CR-${index + 1}`,
              title: cr.title || cr.name || "Untitled Change Request",
              date: cr.date || cr.createdAt || "N/A",
              status: cr.status || "Pending",
            }))
          : [],
      }));

      setProjects(formattedProjects);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
      setProjects([]);
    }
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    let matchesFilter = true;

    if (activeFilter === "Status: In Development")
      matchesFilter = project.status === "In Development";
    else if (activeFilter === "Status: Testing")
      matchesFilter = project.status === "Testing";
    else if (activeFilter === "Status: Requirements")
      matchesFilter = project.status === "Requirements";
    else if (activeFilter === "Progress: > 50%")
      matchesFilter = project.progress > 50;
    else if (activeFilter === "Progress: < 50%")
      matchesFilter = project.progress < 50;

    return matchesSearch && matchesFilter;
  });

  const totalCRs = selectedProject?.changeRequests?.length || 0;

  const completedCRs =
    selectedProject?.changeRequests?.filter(
      (cr) => String(cr.status).toLowerCase() === "completed"
    ).length || 0;

  const pendingCRs =
    selectedProject?.changeRequests?.filter(
      (cr) => String(cr.status).toLowerCase() !== "completed"
    ).length || 0;

  return (
    <div className="space-y-6 -mt-6 relative z-10 px-8 pb-10">
      <div className="flex items-center gap-4 relative">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400">
            <Icons.Search />
          </div>
          <input
            type="text"
            className="block w-full pl-14 pr-5 py-4 border border-transparent rounded-2xl bg-[#e5e7eb]/80 text-gray-900 placeholder-gray-500 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            placeholder="Search projects by name...."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className="flex items-center gap-3 px-6 py-4 bg-[#e5e7eb]/80 text-gray-900 font-semibold rounded-2xl hover:bg-gray-200 transition-all border border-gray-100 min-w-[200px] justify-between"
          >
            <div className="flex items-center gap-2">
              <Icons.Filter />
              <span className="text-base">{activeFilter}</span>
            </div>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${
                showFilterDropdown ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {showFilterDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-2 overflow-hidden">
              {filters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => {
                    setActiveFilter(filter);
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full text-left px-5 py-2.5 text-base font-semibold hover:bg-gray-50 transition-colors ${
                    activeFilter === filter
                      ? "text-[#7c3aed] bg-purple-50"
                      : "text-gray-600"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#f9fafb] border-b border-gray-200">
              <tr>
                <th className="px-8 py-6 text-left text-lg font-bold text-gray-800 w-1/5">
                  Project Name
                </th>
                <th className="px-8 py-6 text-left text-lg font-bold text-gray-800 w-1/4">
                  Progress
                </th>
                <th className="px-8 py-6 text-left text-lg font-bold text-gray-800 w-1/4">
                  Timeline
                </th>
                <th className="px-8 py-6 text-left text-lg font-bold text-gray-800 w-1/6">
                  Budget
                </th>
                <th className="px-8 py-6 text-center text-lg font-bold text-gray-800 w-[140px]">
                  View
                </th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-100">
              {filteredProjects.length > 0 ? (
                filteredProjects.map((project) => (
                  <tr
                    key={project.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-8 py-6 text-base font-semibold text-gray-900">
                      {project.name}
                    </td>

                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <span className="text-base font-bold text-gray-900 min-w-[45px]">
                          {project.progress}%
                        </span>
                        <div className="flex-1 max-w-[120px] bg-gray-200 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-green-500 h-full rounded-full transition-all"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="px-8 py-6 text-base font-semibold text-gray-900">
                      {project.startDate}
                    </td>

                    <td className="px-8 py-6 text-base font-bold text-gray-900">
                      ${Number(project.budget).toLocaleString()}
                    </td>

                    <td className="px-8 py-6 text-center">
                      <button
                        onClick={() => {
                          setSelectedProject(project);
                          setActiveTab("changeRequests");
                          console.log("SELECTED PROJECT =", project);
                        }}
                        className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-violet-700"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-8 py-20 text-center text-lg font-semibold text-gray-400"
                  >
                    No projects found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedProject && (
        <div
          onClick={() => setSelectedProject(null)}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden relative cursor-default max-h-[90vh] overflow-y-auto"
          >
            <button
              onClick={() => setSelectedProject(null)}
              className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-all z-10"
            >
              <svg
                className="w-6 h-6 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <div className="p-10">
              <h3 className="text-3xl font-bold text-gray-900 mb-3">
                {selectedProject.name}
              </h3>

              <p className="text-base text-gray-600 mb-6 leading-relaxed">
                {selectedProject.description}
              </p>

              <div className="inline-flex items-center gap-3 bg-gray-50 px-5 py-3 rounded-xl border border-gray-200 mb-6">
                <div className="text-orange-500">
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <p className="text-base font-bold text-gray-900">
                  Timeline: {selectedProject.startDate}
                </p>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-6">
                <StatCard
                  label="PROGRESS"
                  value={`${selectedProject.progress}%`}
                />
                <StatCard label="TOTAL CRS" value={totalCRs} icon="📄" />
                <StatCard label="COMPLETED" value={completedCRs} icon="✓" />
                <StatCard label="PENDING" value={pendingCRs} icon="!" />
              </div>

              <div className="bg-gray-100 p-1.5 rounded-2xl flex mb-6">
                <button
                  onClick={() => setActiveTab("changeRequests")}
                  className={`flex-1 py-3 text-base font-bold rounded-xl transition-all ${
                    activeTab === "changeRequests"
                      ? "bg-white shadow-sm text-gray-900"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Change Requests
                </button>

                <button
                  onClick={() => setActiveTab("documents")}
                  className={`flex-1 py-3 text-base font-bold rounded-xl transition-all ${
                    activeTab === "documents"
                      ? "bg-white shadow-sm text-gray-900"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Documents
                </button>
              </div>

              {activeTab === "changeRequests" && (
                <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
                  <table className="w-full">
                    <thead className="bg-[#f9fafb] border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-800">
                          ID
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-800">
                          Title
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-800">
                          Date
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-800">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {selectedProject.changeRequests &&
                      selectedProject.changeRequests.length > 0 ? (
                        selectedProject.changeRequests.map((cr, index) => (
                          <ChangeRequestRow
                            key={cr.id || index}
                            id={cr.id || `CR-${index + 1}`}
                            title={cr.title || "Untitled Change Request"}
                            date={formatDate(cr.date)}
                            status={cr.status || "Pending"}
                          />
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-6 py-8 text-center text-sm font-semibold text-gray-400"
                          >
                            No Change Requests
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === "documents" && (
                <div className="border border-gray-200 rounded-2xl p-8 bg-gray-50 text-center">
                  <p className="text-gray-500 font-semibold">
                    No documents available for this project.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, icon }) => (
  <div className="bg-gray-50 rounded-2xl p-5 text-center border border-gray-200">
    <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
      {label}
    </p>
    <div className="flex items-center justify-center gap-2">
      {icon && <span className="text-xl">{icon}</span>}
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

const ChangeRequestRow = ({ id, title, date, status }) => {
  const normalizedStatus = String(status).toLowerCase();

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 text-sm font-semibold text-gray-600">{id}</td>
      <td className="px-6 py-4 text-sm font-bold text-gray-900">{title}</td>
      <td className="px-6 py-4 text-sm font-semibold text-gray-900">{date}</td>
      <td className="px-6 py-4">
        <span
          className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold ${
            normalizedStatus === "completed"
              ? "bg-green-100 text-green-800"
              : normalizedStatus === "in progress"
                ? "bg-orange-100 text-orange-800"
                : normalizedStatus === "approved"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-700"
          }`}
        >
          {status}
        </span>
      </td>
    </tr>
  );
};

const formatDate = (dateValue) => {
  if (!dateValue || dateValue === "N/A") return "N/A";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default Projects;