import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, FileText, CheckCircle, Clock3, XCircle } from "lucide-react";
import { getClientProposals, getCompanyProposals } from "../services/api";
import { mergeProposalWithCachedDetails } from "../utils/proposalDetailsCache";

const STATUS_STYLES = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Rejected: "bg-rose-50 text-rose-700 border-rose-200",
};

const normalizeStatus = (rawStatus) => {
  const value = String(rawStatus || "").trim().toUpperCase();
  if (value === "ACCEPTED") return "Accepted";
  if (value === "REJECTED") return "Rejected";
  return "Pending";
};

const formatProposal = (proposal, role) => ({
  id: proposal.id,
  title: proposal.title || "Untitled Proposal",
  companyName:
    role === "COMPANY"
      ? proposal.clientName || proposal.clientId || "Unassigned Client"
      : proposal.companyId || "Unknown Company",
  companyId: proposal.companyId || "",
  clientId: proposal.clientId || "",
  clientName: proposal.clientName || "",
  description: proposal.description || "No description provided",
  submittedAt: proposal.createdAt
    ? new Date(proposal.createdAt).toLocaleDateString()
    : "-",
  createdAt: proposal.createdAt || null,
  updatedAt: proposal.updatedAt || null,
  totalBudget: proposal.totalBudget ?? null,
  totalDurationDays: proposal.totalDurationDays ?? null,
  budgetData: proposal.budgetData || [],
  timelines: proposal.timelines || [],
  status: normalizeStatus(proposal.status),
  rawStatus: String(proposal.status || "PENDING").toUpperCase(),
  rejectionReason: proposal.rejectionReason || "",
});

const Proposals = ({ role }) => {
  const router = useRouter();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const currentRole = useMemo(() => {
    if (role) return String(role).toUpperCase();

    if (typeof window === "undefined") return "CLIENT";

    try {
      const storedUser = JSON.parse(localStorage.getItem("crms_user") || "{}");
      return String(storedUser.role || "CLIENT").toUpperCase();
    } catch {
      return "CLIENT";
    }
  }, [role]);

  useEffect(() => {
    const fetchProposals = async () => {
      try {
        setLoading(true);
        setPageError("");

        const data =
          currentRole === "COMPANY"
            ? await getCompanyProposals()
            : await getClientProposals();

        setProposals(
          (Array.isArray(data) ? data : []).map((proposal) =>
            formatProposal(
              mergeProposalWithCachedDetails(proposal),
              currentRole
            )
          )
        );
      } catch (error) {
        console.error(error);
        setPageError(error.message || "Failed to fetch proposals");
      } finally {
        setLoading(false);
      }
    };

    fetchProposals();
  }, [currentRole]);

  const statusCounts = useMemo(() => {
    return proposals.reduce(
      (acc, proposal) => {
        acc.total += 1;
        acc[proposal.status] += 1;
        return acc;
      },
      { total: 0, Pending: 0, Accepted: 0, Rejected: 0 }
    );
  }, [proposals]);

  const handleViewProposal = (proposalId) => {
    const selected =
      proposals.find((proposal) => proposal.id === proposalId) || null;

    if (typeof window !== "undefined" && selected) {
      window.sessionStorage.setItem(
        "crms:selectedProposal",
        JSON.stringify(selected)
      );
    }

    const basePath =
      currentRole === "COMPANY"
        ? "/company/ProposalDetailsSection"
        : "/client/ProposalDetailsSection";

    router.push(`${basePath}?proposalId=${encodeURIComponent(proposalId)}`);
  };

  if (loading) {
    return (
      <div className="rounded-[28px] border border-white bg-white/90 p-10 text-center shadow-xl">
        <p className="text-lg font-black text-slate-800">
          Loading proposals...
        </p>
        <p className="mt-2 text-sm font-medium text-slate-500">
          Please wait while we fetch proposal details.
        </p>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="rounded-[28px] border border-red-200 bg-red-50 p-10 text-center shadow-xl">
        <p className="text-lg font-black text-red-700">{pageError}</p>
      </div>
    );
  }

  return (
    <div className="relative z-10 space-y-8 px-2 pb-10 sm:px-4">

      <div className="grid grid-cols-1 gap-5 md:grid-cols-4">
        <SummaryCard
          label="Total Proposals"
          value={statusCounts.total}
          icon={<FileText className="h-5 w-5" />}
          tone="indigo"
        />
        <SummaryCard
          label="Pending"
          value={statusCounts.Pending}
          icon={<Clock3 className="h-5 w-5" />}
          tone="amber"
        />
        <SummaryCard
          label="Accepted"
          value={statusCounts.Accepted}
          icon={<CheckCircle className="h-5 w-5" />}
          tone="emerald"
        />
        <SummaryCard
          label="Rejected"
          value={statusCounts.Rejected}
          icon={<XCircle className="h-5 w-5" />}
          tone="rose"
        />
      </div>

      <div className="overflow-hidden rounded-[32px] border border-white bg-white/95 shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">
              Proposal List
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {proposals.length} proposal{proposals.length === 1 ? "" : "s"}{" "}
              found
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px]">
            <thead className="bg-slate-50">
              <tr>
                <TableHead>Proposal ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>
                  {currentRole === "COMPANY" ? "Client" : "Company"}
                </TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead center>Status</TableHead>
                <TableHead center>Action</TableHead>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {proposals.length > 0 ? (
                proposals.map((proposal) => (
                  <tr
                    key={proposal.id}
                    className="transition hover:bg-indigo-50/40"
                  >
                    <td
                      className="px-6 py-5 text-sm font-black text-slate-900"
                      title={proposal.id}
                    >
                      {proposal.id.substring(0, 12)}...
                    </td>

                    <td
                      className="max-w-[260px] px-6 py-5 text-sm font-bold text-slate-700"
                      title={proposal.title}
                    >
                      <div className="truncate">{proposal.title}</div>
                      <p className="mt-1 truncate text-xs font-medium text-slate-400">
                        {proposal.description}
                      </p>
                    </td>

                    <td
                      className="max-w-[260px] px-6 py-5 text-sm font-semibold text-slate-600"
                      title={proposal.companyName}
                    >
                      <div className="truncate">{proposal.companyName}</div>
                    </td>

                    <td className="whitespace-nowrap px-6 py-5 text-sm font-semibold text-slate-600">
                      {proposal.submittedAt}
                    </td>

                    <td className="px-6 py-5 text-center">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-black ${STATUS_STYLES[proposal.status]}`}
                      >
                        {proposal.status}
                      </span>
                    </td>

                    <td className="px-6 py-5 text-center">
                      <button
                        type="button"
                        onClick={() => handleViewProposal(proposal.id)}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-600"
                      >
                        <Eye className="h-4 w-4" />
                        View More
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
                    No proposals available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const TableHead = ({ children, center = false }) => (
  <th
    className={`px-6 py-5 text-xs font-black uppercase tracking-[0.18em] text-slate-400 ${
      center ? "text-center" : "text-left"
    }`}
  >
    {children}
  </th>
);

const SummaryCard = ({ label, value, icon, tone = "indigo" }) => {
  const toneStyles = {
    indigo: {
      bg: "from-indigo-500 to-violet-500",
      iconBg: "bg-indigo-50 text-indigo-600",
    },
    amber: {
      bg: "from-amber-400 to-orange-500",
      iconBg: "bg-amber-50 text-amber-600",
    },
    emerald: {
      bg: "from-emerald-400 to-teal-500",
      iconBg: "bg-emerald-50 text-emerald-600",
    },
    rose: {
      bg: "from-rose-400 to-pink-500",
      iconBg: "bg-rose-50 text-rose-600",
    },
  };

  const styles = toneStyles[tone] || toneStyles.indigo;

  return (
    <div className="group relative overflow-hidden rounded-[28px] border border-white bg-white p-6 shadow-[0_20px_55px_rgba(15,23,42,0.10)] transition hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.14)]">
      <div
        className={`absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${styles.bg} opacity-10 transition group-hover:scale-125`}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">
            {label}
          </p>
          <p className="mt-4 text-4xl font-black text-slate-950">{value}</p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${styles.iconBg}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

export default Proposals;