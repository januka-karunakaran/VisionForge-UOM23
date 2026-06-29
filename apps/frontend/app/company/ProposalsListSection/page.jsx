"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ProposalsListSection from "@/pages/ProposalsListSection";
import { getCompanyProposals } from "@/services/api";
import { mergeProposalWithCachedDetails } from "@/utils/proposalDetailsCache";

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

const formatDate = (rawDate) => {
  if (!rawDate) return "-";

  const value = new Date(rawDate);
  if (Number.isNaN(value.getTime())) return "-";

  return value.toLocaleDateString();
};

const mapProposal = (proposal) => ({
  id: proposal.id,
  title: proposal.title || "Untitled Proposal",
  client: proposal.clientId || "Not assigned",
  description: proposal.description || "No description provided",
  budget:
    typeof proposal.totalBudget === "number"
      ? `$${proposal.totalBudget.toFixed(2)}`
      : "$0.00",
  totalBudget: proposal.totalBudget ?? null,
  budgetData: proposal.budgetData || [],
  duration:
    typeof proposal.totalDurationDays === "number"
      ? `${proposal.totalDurationDays} days`
      : "0 days",
  totalDurationDays: proposal.totalDurationDays ?? null,
  timelines: proposal.timelines || [],
  status: String(proposal.status || "PENDING").toUpperCase(),
  createdAt: formatDate(proposal.createdAt),
  submittedAt: formatDate(proposal.createdAt),
  updatedAt: proposal.updatedAt || null,
  companyId: proposal.companyId,
  clientId: proposal.clientId,
  clientName: proposal.clientName || "",
  rejectionReason: proposal.rejectionReason || "",
});

export default function CompanyProposalsListSectionPage() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [companyId, setCompanyId] = useState(null);

  useEffect(() => {
    const resolvedCompanyId = resolveCompanyId();
    setCompanyId(resolvedCompanyId);

    if (!resolvedCompanyId) {
      setError("Company ID is missing. Please login again.");
      setLoading(false);
      return;
    }

    const fetchProposals = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getCompanyProposals(resolvedCompanyId);
        const proposals = Array.isArray(data)
          ? data.map((proposal) =>
              mapProposal(mergeProposalWithCachedDetails(proposal)),
            )
          : [];
        setProjects(proposals);
      } catch (fetchError) {
        setError(fetchError.message || "Failed to fetch proposals");
      } finally {
        setLoading(false);
      }
    };

    fetchProposals();
  }, []);



  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="p-4 rounded border border-blue-200 bg-blue-50 text-blue-800">
          Loading proposals...
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-4 rounded border border-red-200 bg-red-50 text-red-800">
          {error}
        </div>
      );
    }

    return null;
  }, [loading, error]);

  return (
    <div className="space-y-4">
      {content}
      <ProposalsListSection
        projects={projects}
        onCreate={() => router.push("/company/CreateProposalSection")}
        onSelect={(project) => {
          window.sessionStorage.setItem(
            "crms:selectedProposal",
            JSON.stringify(project),
          );
          window.sessionStorage.setItem("crms:companyId", companyId || "");
          router.push(
            `/company/ProposalDetailsSection?proposalId=${encodeURIComponent(project.id)}`,
          );
        }}
      />
    </div>
  );
}
