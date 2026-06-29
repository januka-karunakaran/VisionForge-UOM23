"use client";

import React, { useState, useMemo } from "react";
import { X } from "lucide-react";

const cn = (...classes) => classes.filter(Boolean).join(" ");

export default function CreateProposalSection({
  newProposal = { title: "", clientId: "", clientName: "", description: "" },
  setNewProposal = () => {},
  showTimeline = true,
  setShowTimeline = () => {},
  showBudget = true,
  setShowBudget = () => {},
  timelineData = [],
  setTimelineData = () => {},
  budgetData = [],
  setBudgetData = () => {},
  onClear = () => {},
  onSubmit = () => {},
  onClose = () => {},
  clientOptions = [],
}) {
  const now = new Date();
  const minDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(now.getDate()).padStart(2, "0")}`;

  const [timelineSavedMessage, setTimelineSavedMessage] = useState("");
  const [budgetSavedMessage, setBudgetSavedMessage] = useState("");

  const isNonEmpty = (value) => String(value ?? "").trim() !== "";

  const isProposalComplete =
    isNonEmpty(newProposal.title) &&
    isNonEmpty(newProposal.clientId) &&
    isNonEmpty(newProposal.clientName) &&
    isNonEmpty(newProposal.description);

  const isTimelineComplete =
    timelineData.length > 0 &&
    timelineData.every(
      (row) =>
        isNonEmpty(row.phase) &&
        isNonEmpty(row.startDate) &&
        isNonEmpty(row.endDate) &&
        isNonEmpty(row.duration) &&
        isNonEmpty(row.assignedTo)
    );

  const isBudgetComplete =
    budgetData.length > 0 &&
    budgetData.every(
      (row) =>
        isNonEmpty(row.item) &&
        isNonEmpty(row.unit) &&
        isNonEmpty(row.qty) &&
        isNonEmpty(row.unitCost) &&
        isNonEmpty(row.total)
    );

  const isFormValid =
    isProposalComplete && isTimelineComplete && isBudgetComplete;

  // Calculate completion percentage
  const editorCompletion = useMemo(() => {
    const totalFields = 21;
    let filledFields = 0;

    if (isNonEmpty(newProposal.title)) filledFields++;
    if (isNonEmpty(newProposal.clientId)) filledFields++;
    if (isNonEmpty(newProposal.clientName)) filledFields++;
    if (isNonEmpty(newProposal.description)) filledFields++;

    filledFields += timelineData.filter(
      (row) =>
        isNonEmpty(row.phase) &&
        isNonEmpty(row.startDate) &&
        isNonEmpty(row.endDate)
    ).length * 3;

    filledFields += budgetData.filter(
      (row) =>
        isNonEmpty(row.item) &&
        isNonEmpty(row.qty) &&
        isNonEmpty(row.unitCost)
    ).length * 3;

    const percent = Math.round((filledFields / totalFields) * 100);
    return {
      percent: Math.min(percent, 100),
      completed: filledFields,
      total: totalFields,
    };
  }, [newProposal, timelineData, budgetData]);

  // Document sections for outline
  const documentSections = useMemo(
    () => [
      {
        label: "Proposal Information",
        state: isProposalComplete ? "complete" : "missing",
      },
      {
        label: "Timeline",
        state: isTimelineComplete ? "complete" : "missing",
      },
      {
        label: "Estimated Budget",
        state: isBudgetComplete ? "complete" : "missing",
      },
    ],
    [isProposalComplete, isTimelineComplete, isBudgetComplete]
  );

  const calculateDurationInDays = (startDate, endDate) => {
    if (!startDate || !endDate) return "";

    const start = new Date(startDate);
    const end = new Date(endDate);
    const oneDayInMs = 24 * 60 * 60 * 1000;
    const diffInDays = Math.floor((end - start) / oneDayInMs) + 1;

    if (Number.isNaN(diffInDays) || diffInDays < 1) return "";

    return `${diffInDays} days`;
  };

  const calculateRowTotal = (qty, unitCost) => {
    if (qty === "" || unitCost === "") return "";

    const parsedQuantity = Number(qty);
    const parsedUnitCost = Number(unitCost);

    if (Number.isNaN(parsedQuantity) || Number.isNaN(parsedUnitCost)) {
      return "";
    }

    return String(Number((parsedQuantity * parsedUnitCost).toFixed(2)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-3xl border border-slate-200 bg-[#F5F7FB] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-300 px-6 py-5">
          <h2 className="text-3xl font-extrabold text-[#1A1A40]">
            Create New Proposal
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 overflow-y-auto px-6 py-6">
          {/* Progress Card */}
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-[#F7F8FC] p-3 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1A1A40]">
                  Document editor
                </p>
                <h3 className="mt-1 text-base font-semibold text-slate-900">
                  Create a structured proposal document.
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

            {/* Progress Bar */}
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#1A1A40] to-[#5D57A3] transition-all"
                style={{ width: `${editorCompletion.percent}%` }}
              />
            </div>

            {/* Guidance & Outline */}
            <div className="mt-3 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
              {/* Writing Guidance */}
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

              {/* Document Outline */}
              <div className="rounded-2xl border border-slate-200 bg-white p-2">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Document outline
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  {documentSections.map((section) => (
                    <button
                      key={section.label}
                      type="button"
                      onClick={() => {
                        const id = `section-${section.label
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")}`;
                        const el = document.getElementById(id);
                        if (el)
                          el.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
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

          {/* Proposal Information Section */}
          <section
            id="section-proposal-information"
            className="space-y-3 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm"
          >
            <h3 className="border-b border-slate-400 pb-2 text-lg font-bold text-slate-800">
              Proposal Information
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <input
                value={newProposal.title}
                onChange={(event) =>
                  setNewProposal({ ...newProposal, title: event.target.value })
                }
                placeholder="Project title *"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 md:col-span-2"
              />

              <div className="md:col-span-2">
                <select
                  value={newProposal.clientId}
                  onChange={(event) => {
                    const selectedClient = clientOptions.find(
                      (client) => client.id === event.target.value
                    );

                    setNewProposal({
                      ...newProposal,
                      clientId: event.target.value,
                      clientName:
                        selectedClient?.fullName ||
                        selectedClient?.email ||
                        newProposal.clientName ||
                        "",
                    });
                  }}
                  aria-label="Client ID"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                >
                  <option value="">Select Client ID *</option>
                  {clientOptions.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.id} - {client.fullName || client.email || "Client"}
                    </option>
                  ))}
                </select>

                {clientOptions.length === 0 && (
                  <p className="mt-2 text-xs font-medium text-slate-500">
                    No registered clients found. Register a client first.
                  </p>
                )}
              </div>

              <input
                value={newProposal.clientName || ""}
                onChange={(event) =>
                  setNewProposal({
                    ...newProposal,
                    clientName: event.target.value,
                  })
                }
                placeholder="Client name *"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 md:col-span-2"
              />

              <textarea
                value={newProposal.description}
                onChange={(event) =>
                  setNewProposal({
                    ...newProposal,
                    description: event.target.value,
                  })
                }
                placeholder="Description *"
                rows={3}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 md:col-span-4"
              />
            </div>
          </section>

          {/* Timeline Section */}
          <section
            id="section-timeline"
            className="space-y-3 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm"
          >
            <h3 className="border-b border-slate-400 pb-2 text-lg font-bold text-slate-800">
              Timeline
            </h3>

            {showTimeline ? (
              <>
                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="w-full min-w-[600px] text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                          Phase
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                          Start Date
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                          End Date
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                          Duration
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                          Assigned
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 bg-white">
                      {timelineData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-3">
                            <input
                              value={row.phase}
                              onChange={(e) => {
                                const newData = [...timelineData];
                                newData[idx].phase = e.target.value;
                                setTimelineData(newData);
                              }}
                              placeholder="Phase"
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                            />
                          </td>

                          <td className="px-3 py-3">
                            <input
                              type="date"
                              value={row.startDate}
                              min={minDate}
                              onChange={(e) => {
                                const newData = [...timelineData];
                                newData[idx].startDate = e.target.value;
                                newData[idx].duration = calculateDurationInDays(
                                  newData[idx].startDate,
                                  newData[idx].endDate
                                );
                                setTimelineData(newData);
                              }}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                            />
                          </td>

                          <td className="px-3 py-3">
                            <input
                              type="date"
                              value={row.endDate}
                              min={row.startDate || minDate}
                              onChange={(e) => {
                                const newData = [...timelineData];
                                newData[idx].endDate = e.target.value;
                                newData[idx].duration = calculateDurationInDays(
                                  newData[idx].startDate,
                                  newData[idx].endDate
                                );
                                setTimelineData(newData);
                              }}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                            />
                          </td>

                          <td className="px-3 py-3">
                            <input
                              value={row.duration}
                              readOnly
                              placeholder="Duration"
                              className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 outline-none"
                            />
                          </td>

                          <td className="px-3 py-3">
                            <input
                              value={row.assignedTo}
                              onChange={(e) => {
                                const newData = [...timelineData];
                                newData[idx].assignedTo = e.target.value;
                                setTimelineData(newData);
                              }}
                              placeholder="Assigned To"
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setTimelineData([
                        ...timelineData,
                        {
                          phase: "",
                          startDate: "",
                          endDate: "",
                          duration: "",
                          assignedTo: "",
                        },
                      ])
                    }
                    className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white transition hover:bg-indigo-700 shadow-lg hover:-translate-y-0.5"
                  >
                    Add Row
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowTimeline(false)}
                    className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200"
                  >
                    Collapse
                  </button>

                  {timelineSavedMessage && (
                    <p className="text-sm font-bold text-emerald-600">
                      {timelineSavedMessage}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowTimeline(true)}
                className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white transition hover:bg-indigo-700 shadow-lg"
              >
                Expand Timeline
              </button>
            )}
          </section>

          {/* Budget Section */}
          <section
            id="section-estimated-budget"
            className="space-y-3 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm"
          >
            <h3 className="border-b border-slate-400 pb-2 text-lg font-bold text-slate-800">
              Estimated Budget
            </h3>

            {showBudget ? (
              <>
                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="w-full min-w-[600px] text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                          Item
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                          Unit
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                          Qty
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                          Unit Cost
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                          Total
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 bg-white">
                      {budgetData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-3">
                            <input
                              value={row.item}
                              onChange={(e) => {
                                const newData = [...budgetData];
                                newData[idx].item = e.target.value;
                                setBudgetData(newData);
                              }}
                              placeholder="Item"
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                            />
                          </td>

                          <td className="px-3 py-3">
                            <select
                              value={row.unit || "hours"}
                              onChange={(e) => {
                                const newData = [...budgetData];
                                newData[idx].unit = e.target.value;
                                setBudgetData(newData);
                              }}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                            >
                              <option value="hours">hours</option>
                              <option value="days">days</option>
                              <option value="weeks">weeks</option>
                              <option value="months">months</option>
                            </select>
                          </td>

                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min="0"
                              value={row.qty}
                              onChange={(e) => {
                                const newData = [...budgetData];
                                newData[idx].qty = e.target.value;
                                newData[idx].total = calculateRowTotal(
                                  newData[idx].qty,
                                  newData[idx].unitCost
                                );
                                setBudgetData(newData);
                              }}
                              placeholder="Qty"
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                            />
                          </td>

                          <td className="px-3 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.unitCost}
                              onChange={(e) => {
                                const newData = [...budgetData];
                                newData[idx].unitCost = e.target.value;
                                newData[idx].total = calculateRowTotal(
                                  newData[idx].qty,
                                  newData[idx].unitCost
                                );
                                setBudgetData(newData);
                              }}
                              placeholder="Unit Cost"
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                            />
                          </td>

                          <td className="px-3 py-3">
                            <input
                              value={row.total}
                              readOnly
                              placeholder="Total"
                              className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 outline-none"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setBudgetData([
                        ...budgetData,
                        {
                          item: "",
                          unit: "hours",
                          qty: "",
                          unitCost: "",
                          total: "",
                        },
                      ])
                    }
                    className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white transition hover:bg-indigo-700 shadow-lg hover:-translate-y-0.5"
                  >
                    Add Row
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowBudget(false)}
                    className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200"
                  >
                    Collapse
                  </button>

                  {budgetSavedMessage && (
                    <p className="text-sm font-bold text-emerald-600">
                      {budgetSavedMessage}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowBudget(true)}
                className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white transition hover:bg-indigo-700 shadow-lg"
              >
                Expand Budget
              </button>
            )}
          </section>

          {/* Validation Warning */}
          {!isFormValid && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-600">
              All fields are required. Fill every column to enable submit.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap gap-3 border-t border-slate-300 px-6 py-5">
          <button
            type="button"
            onClick={onClear}
            className="rounded-2xl bg-rose-600 px-6 py-3 text-sm font-black text-white transition hover:bg-rose-700 shadow-lg"
          >
            Clear
          </button>

          <button
            type="submit"
            disabled={!isFormValid}
            className={`rounded-2xl px-8 py-3 text-sm font-black text-white shadow-lg transition ${
              isFormValid
                ? "bg-gradient-to-r from-indigo-600 to-violet-600 hover:-translate-y-0.5 hover:shadow-xl"
                : "cursor-not-allowed bg-slate-300"
            }`}
          >
            Submit Proposal
          </button>
        </div>
      </form>
    </div>
  );
}
