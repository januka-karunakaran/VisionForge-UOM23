/* eslint-disable react/prop-types */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { User } from "lucide-react";
import logo from "../assets/images/logo.jpeg";
import { clearSession } from "../utils/auth";
import { getCurrentUserProfile } from "../services/api";

const clientItems = [
  { href: "/client/dashboard", label: "Dashboard" },
  { href: "/client/Proposal", label: "Proposals" },
  { href: "/client/Project", label: "Projects" },
  { href: "/client/Document", label: "Documents" },
  { href: "/client/ChangeRequest", label: "Change Requests" },
  { href: "/client/Kanban", label: "Kanban" },

];

const companyItems = [
  { href: "/company/DashboardSection", label: "Dashboard" },
  { href: "/company/ProposalsListSection", label: "Proposals" },
  { href: "/company/CreateProposalSection", label: "Create Proposal" },
  { href: "/company/PrdRepository", label: "PRD Repository" },
  { href: "/company/Prd-details&Editor", label: "PRD Details & Editor" },
  { href: "/company/KanbanOverviewPage", label: "Kanban" },
  { href: "/company/Audit-trail", label: "Audit Trail" },
  { href: "/company/Version-history", label: "Version History" },
  
];

function isActivePath(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppSidebar({ section = "client" }) {
  const pathname = usePathname();
  const router = useRouter();

  const [profile, setProfile] = useState({
    username: "",
    email: "",
    profileImage: "",
  });

  const menuItems = section === "company" ? companyItems : clientItems;
  const portalName = section === "company" ? "Company Portal" : "Client Portal";
  const editProfilePath =
    section === "company" ? "/company/EditProfile" : "/client/EditProfile";

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await getCurrentUserProfile();

        setProfile({
          username:
            data?.username ||
            data?.fullName ||
            data?.name ||
            data?.companyName ||
            "User",
          email: data?.email || "",
          profileImage: data?.profileImage || "",
        });
      } catch (error) {
        // Silently ignore auth errors (403/401)
        const msg = String(error?.message || "");
        if (!msg.includes("403") && !msg.includes("401") && !msg.includes("Forbidden")) {
          console.error("Sidebar profile load error:", error);
        }
      }
    };

    loadProfile();
  }, []);

  const initials =
    profile.username
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  return (
    <aside className="relative flex h-full w-[280px] shrink-0 flex-col overflow-hidden border-r border-white/10 bg-gradient-to-b from-[#020617] via-[#0f172a] to-[#111827] text-white shadow-[30px_0_80px_rgba(15,23,42,0.45)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.35),_transparent_32%),radial-gradient(circle_at_bottom,_rgba(14,165,233,0.18),_transparent_38%)]" />

      {/* LOGO SECTION */}
      <div className="relative flex items-center gap-4 px-6 py-6">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white p-2 shadow-lg">
          <img
            src={logo.src || logo}
            alt="CRMS Logo"
            className="h-full w-full object-contain rounded-xl"
          />
        </div>

        <div>
          <h1 className="text-lg font-extrabold uppercase tracking-tight">
            CRMS
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">
            {portalName}
          </p>
        </div>
      </div>

      {/* MENU */}
      <nav className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-2">
        {menuItems.map((item) => {
          const active = isActivePath(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative rounded-xl px-5 py-3 text-sm font-semibold transition-all ${
                active
                  ? "bg-white text-slate-900 shadow-md"
                  : "text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-indigo-500" />
              )}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* PROFILE + LOGOUT */}
      <div className="relative border-t border-white/10 p-4">
        <button
          onClick={() => {
            clearSession();
            router.push("/login");
          }}
          className="w-full rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold transition hover:bg-red-500/20"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}