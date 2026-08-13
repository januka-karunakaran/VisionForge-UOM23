"use client";

import React, { useEffect, useState } from "react";
import { 
  Layout as LayoutIcon, 
  Search, 
  CheckCircle, 
  Clock3, 
  AlertCircle, 
  ChevronRight,
  User,
  MoreVertical,
  Layers
} from "lucide-react";
import Layout from "./Layout";
import { getClientProjects, getClientProjectKanban } from "../services/api";

const priorityStyles = {
  High: "bg-rose-50 text-rose-700 border-rose-200",
  Medium: "bg-amber-50 text-amber-700 border-amber-200",
  Low: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const Kanban = ({ readOnly = false }) => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [board, setBoard] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoadingProjects(true);
      const data = await getClientProjects();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading projects:", err);
      setError(err?.message || "Projects could not be loaded.");
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleProjectChange = async (e) => {
    const projectId = e.target.value;
    setSelectedProjectId(projectId);
    setBoard(null);
    setError("");

    if (!projectId) return;

    try {
      setLoadingBoard(true);
      const data = await getClientProjectKanban(projectId);
      setBoard(data);
    } catch (err) {
      console.error("Error loading kanban board:", err);
      setError(err?.message || "Kanban board could not be loaded.");
    } finally {
      setLoadingBoard(false);
    }
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  return (
    <Layout title="Project Kanban">
      <div className="relative z-10 space-y-8 pb-10">
        
        {/* PROJECT SELECT SECTION */}
        <div className="overflow-hidden rounded-[32px] border border-white bg-white/95 shadow-[0_20px_55px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-6 md:flex-row md:items-center md:justify-between">
             <div>
              <h2 className="text-xl font-black text-slate-950 flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-600" />
                Select Project
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Choose a project to view its current workflow and task status
              </p>
            </div>
          </div>

          <div className="p-6">
            <div className="relative max-w-xl">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <select
                value={selectedProjectId}
                onChange={handleProjectChange}
                className="block w-full pl-12 pr-10 py-4 text-base font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl appearance-none focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all cursor-pointer"
              >
                <option value="">Choose a project...</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name || project.title}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                <ChevronRight className="h-5 w-5 text-slate-400 rotate-90" />
              </div>
            </div>

            {loadingProjects && (
              <div className="mt-4 flex items-center gap-2 text-sm font-bold text-indigo-600">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                Refreshing projects list...
              </div>
            )}
          </div>
        </div>

        {/* ERROR DISPLAY */}
        {error && (
          <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-6 flex items-center gap-4 text-rose-700 shadow-lg">
            <AlertCircle className="h-6 w-6 shrink-0" />
            <p className="font-bold text-lg">{error}</p>
          </div>
        )}

        {/* BOARD CONTENT */}
        {loadingBoard ? (
          <div className="rounded-[32px] border border-white bg-white/95 p-20 text-center shadow-xl backdrop-blur-xl">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            <p className="mt-6 text-xl font-black text-slate-950">Loading Kanban Board...</p>
            <p className="mt-2 text-sm font-medium text-slate-500">We're fetching the latest tasks for {selectedProject?.name}</p>
          </div>
        ) : selectedProjectId && board ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <div>
                <h3 className="text-2xl font-black text-slate-950">{selectedProject?.name}</h3>
                <div className="mt-1 flex items-center gap-4">
                   <span className="flex items-center gap-1.5 text-sm font-bold text-slate-500">
                    <LayoutIcon className="h-4 w-4" />
                    {(board.columns || []).length} Columns
                  </span>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span className="flex items-center gap-1.5 text-sm font-bold text-slate-500">
                    <CheckCircle className="h-4 w-4" />
                    {(board.columns || []).reduce((acc, col) => acc + (col.tasks?.length || 0), 0)} Total Tasks
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-6 overflow-x-auto pb-8 snap-x">
              {(board.columns || []).map((column) => (
                <div
                  key={column.id}
                  className="min-w-[320px] max-w-[320px] snap-start flex flex-col h-full rounded-[32px] border border-white bg-white/90 shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl overflow-hidden"
                >
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-slate-900 tracking-tight">{column.title}</h4>
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-black text-indigo-700">
                        {column.tasks?.length || 0}
                      </span>
                    </div>
                    <button className="text-slate-400 hover:text-slate-600 transition">
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="p-4 space-y-4 flex-1 overflow-y-auto max-h-[60vh] scrollbar-hide">
                    {column.tasks?.length > 0 ? (
                      column.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md hover:border-indigo-100"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <h5 className="font-black text-slate-900 text-sm leading-tight group-hover:text-indigo-600 transition">
                              {task.title}
                            </h5>
                            {task.priority && (
                              <span
                                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                                  priorityStyles[task.priority] || "bg-slate-50 text-slate-600 border-slate-200"
                                }`}
                              >
                                {task.priority}
                              </span>
                            )}
                          </div>

                          {task.description && (
                            <p className="mt-3 text-xs font-semibold text-slate-500 line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}

                          <div className="mt-5 pt-4 border-t border-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <Clock3 className="h-3.5 w-3.5" />
                              <span className="text-[10px] font-bold">Updated Recently</span>
                            </div>
                            
                            {task.assignedTo && (
                              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50 border border-slate-100">
                                <User className="h-3 w-3 text-indigo-500" />
                                <span className="text-[10px] font-black text-slate-600 truncate max-w-[80px]">
                                  {task.assignedTo}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 px-6 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                        <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                          <LayoutIcon className="h-6 w-6 text-slate-300" />
                        </div>
                        <p className="text-xs font-black text-slate-400">No tasks in this stage</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-[32px] border border-white bg-white/95 p-20 text-center shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl">
             <div className="mx-auto h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                <LayoutIcon className="h-10 w-10 text-slate-300" />
             </div>
            <h3 className="text-2xl font-black text-slate-900">Kanban Board Overview</h3>
            <p className="mt-3 max-w-md mx-auto text-slate-500 font-medium">
              Please select a project from the dropdown above to view its development board and track progress across different stages.
            </p>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default Kanban;