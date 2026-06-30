"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X, Bold, Italic, Underline, List, ListOrdered, Quote, Link2 } from "lucide-react";
import { cn } from "@/utils/cn";
import {
  createCompanyProposal,
  getRegisteredClients,
} from "@/services/proposalService";

const resolveCompanyId = () => {
  try {
    const storedUser = JSON.parse(localStorage.getItem("crms_user") || "{}");
    return (
      localStorage.getItem("companyId") ||
      storedUser.companyId ||
      storedUser.id ||
      storedUser.userId ||
      storedUser._id ||
      null
    );
  } catch {
    return null;
  }
};

const hasText = (value) =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .trim().length > 0;

/* ---------------- Professional Minimalist Rich Text Editor ---------------- */
function RichTextField({
  title = "",
  value,
  onChange,
  placeholder = "Enter text",
  className = "",
}) {
  const editorRef = useRef(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const nextValue = String(value || "");
    if (editor.innerHTML !== nextValue) {
      editor.innerHTML = nextValue;
    }
  }, [value]);

  const updateValue = () => {
    const editor = editorRef.current;
    if (!editor) return;
    onChange({ target: { value: editor.innerHTML } });
  };

  const runCommand = (command, argument = null) => {
    const editor = editorRef.current;
    if (!editor || typeof document === "undefined") return;

    editor.focus();
    document.execCommand(command, false, argument);
    updateValue();
  };

  const insertLink = () => {
    if (typeof window === "undefined") return;
    const url = window.prompt("Enter link URL");
    if (!url) return;
    runCommand("createLink", url);
  };

  return (
    <div className={cn("w-full space-y-2", className)}>
      {title && (
        <label className="text-sm font-semibold text-slate-700">
          {title}
        </label>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm transition-all focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-50 overflow-hidden">
        {/* Modern Borderless Toolbar */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-50/70 px-3 py-2 border-b border-slate-100">
          <button
            type="button"
            onClick={() => runCommand("bold")}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 transition"
            title="Bold"
          >
            <Bold size={16} />
          </button>
          <button
            type="button"
            onClick={() => runCommand("italic")}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 transition"
            title="Italic"
          >
            <Italic size={16} />
          </button>
          <button
            type="button"
            onClick={() => runCommand("underline")}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 transition"
            title="Underline"
          >
            <Underline size={16} />
          </button>
          
          <div className="h-4 w-[1px] bg-slate-200 mx-1" />

          <button
            type="button"
            onClick={() => runCommand("insertUnorderedList")}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 transition"
            title="Bullet List"
          >
            <List size={16} />
          </button>
          <button
            type="button"
            onClick={() => runCommand("insertOrderedList")}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 transition"
            title="Numbered List"
          >
            <ListOrdered size={16} />
          </button>
          <button
            type="button"
            onClick={() => runCommand("formatBlock", "blockquote")}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 transition"
            title="Quote"
          >
            <Quote size={16} />
          </button>

          <div className="h-4 w-[1px] bg-slate-200 mx-1" />

          <button
            type="button"
            onClick={insertLink}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 transition"
            title="Insert Link"
          >
            <Link2 size={16} />
          </button>
        </div>

        {/* Editor Writing Canvas */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder}
          onInput={updateValue}
          onBlur={updateValue}
          className={cn(
            "prose prose-sm max-w-none min-h-[120px] px-4 py-3 text-sm text-slate-800 outline-none bg-white font-medium before:text-slate-400 before:pointer-events-none data-placeholder:before:content-[attr(data-placeholder)]",
            !hasText(value) ? "relative before:absolute" : "before:hidden"
          )}
        />
      </div>
    </div>
  );
}

export default function CreateProposalSectionPage() {
  const router = useRouter();
  const [companyId, setCompanyId] = useState(null);
  const [clientOptions, setClientOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");

  const [form, setForm] = useState({
    title: "",
    clientId: "",
    description: "",
    purpose: "",
    keyDeliverables: "",
  });

  const [timelineData, setTimelineData] = useState([
    { phase: "", startDate: "", endDate: "", duration: "", assignedTo: "" },
  ]);

  const [budgetData, setBudgetData] = useState([
    { item: "", unit: "hours", qty: "", unitCost: "", total: "" },
  ]);

  useEffect(() => {
    const resolved = resolveCompanyId();
    setCompanyId(resolved);

    if (!resolved) {
      setError("Company ID is missing. Please login again.");
      return;
    }

    const fetchClients = async () => {
      try {
        const clients = await getRegisteredClients();
        setClientOptions(Array.isArray(clients) ? clients : []);
      } catch (err) {
        console.error("Failed to fetch clients:", err);
      }
    };

    fetchClients();
  }, []);

  const isFormValid = useMemo(() => {
    return (
      hasText(form.title) &&
      hasText(form.clientId) &&
      hasText(form.description) &&
      timelineData.length > 0 &&
      timelineData.every((row) => row.phase && row.startDate && row.endDate) &&
      budgetData.length > 0 &&
      budgetData.every((row) => row.item && row.qty && row.unitCost)
    );
  }, [form, timelineData, budgetData]);

  const editorCompletion = useMemo(() => {
    const totalFields = 4 + timelineData.length + budgetData.length;
    let filledFields = 0;

    if (hasText(form.title)) filledFields++;
    if (hasText(form.clientId)) filledFields++;
    if (hasText(form.description)) filledFields++;
    if (hasText(form.purpose)) filledFields++;

    filledFields += timelineData.filter((row) => row.phase && row.startDate && row.endDate).length;
    filledFields += budgetData.filter((row) => row.item && row.qty && row.unitCost).length;

    const percent = Math.round((filledFields / totalFields) * 100);
    return {
      percent: Math.min(percent, 100),
      completed: filledFields,
      total: totalFields,
    };
  }, [form, timelineData, budgetData]);

  const documentSections = useMemo(
    () => [
      {
        label: "Proposal Information",
        state:
          hasText(form.title) && hasText(form.clientId) && hasText(form.description)
            ? "complete"
            : "missing",
      },
      {
        label: "Timeline",
        state:
          timelineData.length > 0 &&
          timelineData.every((row) => row.phase && row.startDate && row.endDate)
            ? "complete"
            : "missing",
      },
      {
        label: "Budget",
        state:
          budgetData.length > 0 &&
          budgetData.every((row) => row.item && row.qty && row.unitCost)
            ? "complete"
            : "missing",
      },
    ],
    [form.title, form.clientId, form.description, timelineData, budgetData]
  );

  const calculateDuration = (startDate, endDate) => {
    if (!startDate || !endDate) return "";
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;
    return days < 1 ? "" : `${days} days`;
  };

  const calculateTotal = (qty, unitCost) => {
    if (!qty || !unitCost) return "";
    return String(Number((Number(qty) * Number(unitCost)).toFixed(2)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyId || !isFormValid) return;

    try {
      setIsLoading(true);
      setError("");

      const totalDurationDays = timelineData.reduce((sum, row) => {
        const match = (row.duration || "").match(/\d+/);
        return sum + (match ? parseInt(match[0]) : 0);
      }, 0);

      const totalBudget = budgetData.reduce((sum, row) => {
        return sum + (parseFloat(row.total) || 0);
      }, 0);

      const selectedClient = clientOptions.find((c) => String(c.id) === String(form.clientId));

      const payload = {
        title: form.title,
        description: form.description,
        purpose: form.purpose,
        keyDeliverables: form.keyDeliverables,
        clientId: form.clientId,
        clientName: selectedClient?.fullName || selectedClient?.email || "",
        companyId,
        totalDurationDays,
        totalBudget,
        timelines: timelineData,
        budgetData,
        status: "PENDING",
      };

      await createCompanyProposal(payload, companyId);
      setSubmitMessage("Proposal created successfully!");

      setTimeout(() => {
        router.push("/company/ProposalsListSection");
      }, 1500);
    } catch (err) {
      setError(err.message || "Failed to create proposal");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setForm({
      title: "",
      clientId: "",
      description: "",
      purpose: "",
      keyDeliverables: "",
    });
    setTimelineData([{ phase: "", startDate: "", endDate: "", duration: "", assignedTo: "" }]);
    setBudgetData([{ item: "", unit: "hours", qty: "", unitCost: "", total: "" }]);
    setError("");
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-[#1A1A40]">
            Create New Proposal
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Build a comprehensive proposal with rich formatting and structured data
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/company/ProposalsListSection")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300"
        >
          <X size={20} />
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-600">
          {error}
        </div>
      )}

      {submitMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-600">
          {submitMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Progress Card */}
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-[#F7F8FC] p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1A1A40]">
                Document editor
              </p>
              <h3 className="mt-1 text-base font-semibold text-slate-900">
                Create a structured proposal with rich text editing.
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Format your content and organize proposal details.
              </p>
            </div>

            <div className="min-w-[160px] text-right">
              <p className="text-sm font-bold text-slate-900">
                {editorCompletion.percent}% ready
              </p>
              <p className="text-xs text-slate-500">
                {editorCompletion.completed} of {editorCompletion.total} fields
              </p>
            </div>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1A1A40] to-[#5D57A3] transition-all"
              style={{ width: `${editorCompletion.percent}%` }}
            />
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Writing guidance
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
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

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                Document outline
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {documentSections.map((section) => (
                  <button
                    key={section.label}
                    type="button"
                    onClick={() => {
                      const id = `section-${section.label
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "-")}`;
                      const el = document.getElementById(id);
                      if (el) {
                        el.scrollIntoView({ behavior: "smooth", block: "start" });
                      }
                    }}
                    className={cn(
                      "w-full rounded-md px-3 py-2 text-left text-xs font-semibold transition",
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

        {/* Proposal Information */}
        <section
          id="section-proposal-information"
          className="space-y-5 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm"
        >
          <h2 className="border-b border-slate-300 pb-3 text-xl font-bold text-slate-900">
            Proposal Information
          </h2>

          <div className="grid gap-5 md:grid-cols-2">
            <RichTextField
              title="Proposal title"
              value={form.title}
              placeholder="Enter proposal title *"
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />

            <div className="flex flex-col space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Select Client *
              </label>
              <select
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700 outline-none transition shadow-sm focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              >
                <option value="">Select Client *</option>
                {clientOptions.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.fullName || client.email || "Client"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <RichTextField
            title="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Enter proposal details and description *"
          />

          <RichTextField
            title="Purpose"
            value={form.purpose}
            onChange={(e) => setForm({ ...form, purpose: e.target.value })}
            placeholder="Enter the primary objective or purpose"
          />

          <RichTextField
            title="Key Deliverables"
            value={form.keyDeliverables}
            onChange={(e) => setForm({ ...form, keyDeliverables: e.target.value })}
            placeholder="List key items or milestones to be delivered"
          />
        </section>

        {/* Timeline */}
        <section
          id="section-timeline"
          className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm"
        >
          <h2 className="border-b border-slate-300 pb-3 text-xl font-bold text-slate-900">
            Timeline
          </h2>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Phase
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Start Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    End Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Assigned To
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {timelineData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-3 py-3">
                      <input
                        value={row.phase}
                        onChange={(e) => {
                          const data = [...timelineData];
                          data[idx].phase = e.target.value;
                          setTimelineData(data);
                        }}
                        placeholder="Phase"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="date"
                        value={row.startDate}
                        onChange={(e) => {
                          const data = [...timelineData];
                          data[idx].startDate = e.target.value;
                          data[idx].duration = calculateDuration(data[idx].startDate, data[idx].endDate);
                          setTimelineData(data);
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="date"
                        value={row.endDate}
                        onChange={(e) => {
                          const data = [...timelineData];
                          data[idx].endDate = e.target.value;
                          data[idx].duration = calculateDuration(data[idx].startDate, data[idx].endDate);
                          setTimelineData(data);
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        value={row.duration}
                        readOnly
                        placeholder="Auto-calculated"
                        className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        value={row.assignedTo}
                        onChange={(e) => {
                          const data = [...timelineData];
                          data[idx].assignedTo = e.target.value;
                          setTimelineData(data);
                        }}
                        placeholder="Team member"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => setTimelineData(timelineData.filter((_, i) => i !== idx))}
                        className="text-rose-600 hover:text-rose-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={() =>
              setTimelineData([
                ...timelineData,
                { phase: "", startDate: "", endDate: "", duration: "", assignedTo: "" },
              ])
            }
            className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white transition hover:bg-indigo-700"
          >
            <Plus size={18} />
            Add Timeline Row
          </button>
        </section>

        {/* Budget */}
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h2 className="border-b border-slate-300 pb-3 text-xl font-bold text-slate-900">
            Estimated Budget
          </h2>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Item
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Unit
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Unit Cost
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Total
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {budgetData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-3 py-3">
                      <input
                        value={row.item}
                        onChange={(e) => {
                          const data = [...budgetData];
                          data[idx].item = e.target.value;
                          setBudgetData(data);
                        }}
                        placeholder="Item description"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={row.unit}
                        onChange={(e) => {
                          const data = [...budgetData];
                          data[idx].unit = e.target.value;
                          setBudgetData(data);
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      >
                        <option>hours</option>
                        <option>days</option>
                        <option>weeks</option>
                        <option>months</option>
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        min="0"
                        value={row.qty}
                        onChange={(e) => {
                          const data = [...budgetData];
                          data[idx].qty = e.target.value;
                          data[idx].total = calculateTotal(data[idx].qty, data[idx].unitCost);
                          setBudgetData(data);
                        }}
                        placeholder="Qty"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.unitCost}
                        onChange={(e) => {
                          const data = [...budgetData];
                          data[idx].unitCost = e.target.value;
                          data[idx].total = calculateTotal(data[idx].qty, data[idx].unitCost);
                          setBudgetData(data);
                        }}
                        placeholder="Cost"
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        value={row.total}
                        readOnly
                        placeholder="Auto-calculated"
                        className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-semibold"
                      />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => setBudgetData(budgetData.filter((_, i) => i !== idx))}
                        className="text-rose-600 hover:text-rose-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={() =>
              setBudgetData([
                ...budgetData,
                { item: "", unit: "hours", qty: "", unitCost: "", total: "" },
              ])
            }
            className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white transition hover:bg-indigo-700"
          >
            <Plus size={18} />
            Add Budget Row
          </button>
        </section>

        {/* Validation Warning */}
        {!isFormValid && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-bold text-rose-600">
            ⚠️ All required fields must be filled to submit the proposal.
          </div>
        )}

        {/* Form Actions */}
        <div className="flex flex-wrap gap-4 border-t border-slate-200 pt-6">
          <button
            type="button"
            onClick={handleClear}
            className="rounded-2xl bg-slate-100 px-8 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200"
          >
            Clear All
          </button>

          <button
            type="button"
            onClick={() => router.push("/company/ProposalsListSection")}
            className="rounded-2xl bg-slate-100 px-8 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={!isFormValid || isLoading}
            className={cn(
              "rounded-2xl px-8 py-3 text-sm font-black text-white shadow-lg transition",
              isFormValid && !isLoading
                ? "bg-gradient-to-r from-indigo-600 to-violet-600 hover:-translate-y-0.5 hover:shadow-xl"
                : "cursor-not-allowed bg-slate-300"
            )}
          >
            {isLoading ? "Creating..." : "Create Proposal"}
          </button>
        </div>
      </form>
    </div>
  );
}