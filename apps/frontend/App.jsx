import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import NotificationPanel from "./components/NotificationPanel";

import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ChangeRequests from "./pages/ChangeRequests";
import Proposals from "./pages/Proposals";
import Kanban from "./pages/Kanban";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import Documents from "./pages/Documents";
import "./styles/globals.css";

const ROLE = {
  CLIENT: "CLIENT",
  COMPANY: "COMPANY",
};

const PAGE_ACCESS = {
  dashboard: [ROLE.CLIENT, ROLE.COMPANY],
  projects: [ROLE.CLIENT, ROLE.COMPANY],
  documents: [ROLE.CLIENT, ROLE.COMPANY],
  "change-requests": [ROLE.CLIENT, ROLE.COMPANY],
  proposals: [ROLE.CLIENT, ROLE.COMPANY],
  kanban: [ROLE.CLIENT, ROLE.COMPANY],
  notifications: [ROLE.CLIENT, ROLE.COMPANY],
  settings: [ROLE.CLIENT, ROLE.COMPANY],
};

const PAGE_INFO = {
  CLIENT: {
    dashboard: {
      title: "Client Dashboard",
      subtitle: "Track proposals, projects, documents and change requests.",
    },
    projects: {
      title: "Projects",
      subtitle: "View your accepted projects and delivery progress.",
    },
    documents: {
      title: "Project Documents",
      subtitle: "View and download PRDs and project files.",
    },
    "change-requests": {
      title: "Change Requests",
      subtitle: "Create and monitor your requested changes.",
    },
    proposals: {
      title: "Project Proposals",
      subtitle: "Review proposals and make approval decisions.",
    },
    kanban: {
      title: "Client Kanban",
      subtitle: "Follow project workflow in a visual board.",
    },
    notifications: {
      title: "Notifications",
      subtitle: "Stay updated with project and proposal alerts.",
    },
    settings: {
      title: "Settings",
      subtitle: "Manage your profile and portal preferences.",
    },
  },
  COMPANY: {
    dashboard: {
      title: "Company Dashboard",
      subtitle: "Manage proposals, projects, PRDs and client requests.",
    },
    projects: {
      title: "Company Projects",
      subtitle: "Manage active and approved client projects.",
    },
    documents: {
      title: "PRD Repository",
      subtitle: "Upload and maintain project requirement documents.",
    },
    "change-requests": {
      title: "Change Requests",
      subtitle: "Review client requests and take action.",
    },
    proposals: {
      title: "Project Proposals",
      subtitle: "Create and manage proposals sent to clients.",
    },
    kanban: {
      title: "Company Kanban",
      subtitle: "Track team delivery workflow visually.",
    },
    notifications: {
      title: "Notifications",
      subtitle: "View approvals, uploads and request updates.",
    },
    settings: {
      title: "Settings",
      subtitle: "Manage company profile and preferences.",
    },
  },
};

const DEFAULT_PAGE_BY_ROLE = {
  CLIENT: "dashboard",
  COMPANY: "dashboard",
};

const normalizeRole = (role) => {
  if (!role) return "";
  const value = String(role).trim().toUpperCase();
  if (value === "ROLE_CLIENT") return "CLIENT";
  if (value === "ROLE_COMPANY") return "COMPANY";
  return value;
};

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [activePage, setActivePage] = useState("dashboard");
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarMode, setSidebarMode] = useState("expanded");

  useEffect(() => {
    const storedToken = localStorage.getItem("crms_token");
    const storedUser = localStorage.getItem("crms_user");
    const savedSidebarMode = localStorage.getItem("crms_sidebar_mode");
    const savedActivePage = localStorage.getItem("crms_active_page");

    if (savedSidebarMode === "expanded" || savedSidebarMode === "collapsed") {
      setSidebarMode(savedSidebarMode);
    }

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);

        if (parsedUser?.role) {
          const normalizedRole = normalizeRole(parsedUser.role);
          const safeDefaultPage =
            DEFAULT_PAGE_BY_ROLE[normalizedRole] || "dashboard";

          const safeUser = {
            ...parsedUser,
            role: normalizedRole,
          };

          setUser(safeUser);
          setIsLoggedIn(true);

          if (
            savedActivePage &&
            typeof savedActivePage === "string" &&
            PAGE_ACCESS[savedActivePage]?.includes(normalizedRole)
          ) {
            setActivePage(savedActivePage);
          } else {
            setActivePage(safeDefaultPage);
            localStorage.setItem("crms_active_page", safeDefaultPage);
          }
        }
      } catch (error) {
        console.error("Failed to parse stored user:", error);
        localStorage.removeItem("crms_token");
        localStorage.removeItem("crms_user");
        localStorage.removeItem("crms_role");
        localStorage.removeItem("crms_active_page");
        localStorage.removeItem("companyId");
        localStorage.removeItem("clientId");
      }
    }
  }, []);

  const currentRole = user?.role || null;

  const allowedPages = useMemo(() => {
    if (!currentRole) return [];
    return Object.keys(PAGE_ACCESS).filter((page) =>
      PAGE_ACCESS[page].includes(currentRole)
    );
  }, [currentRole]);

  const safeSetActivePage = (page) => {
    if (!currentRole) return;

    if (PAGE_ACCESS[page]?.includes(currentRole)) {
      setActivePage(page);
      localStorage.setItem("crms_active_page", page);
      setShowNotifications(false);
    } else {
      const fallbackPage = DEFAULT_PAGE_BY_ROLE[currentRole] || "dashboard";
      setActivePage(fallbackPage);
      localStorage.setItem("crms_active_page", fallbackPage);
      setShowNotifications(false);
    }
  };

  useEffect(() => {
    if (!currentRole) return;

    const isCurrentPageAllowed =
      typeof activePage === "string" &&
      PAGE_ACCESS[activePage]?.includes(currentRole);

    if (!isCurrentPageAllowed) {
      const fallbackPage = DEFAULT_PAGE_BY_ROLE[currentRole] || "dashboard";
      setActivePage(fallbackPage);
      localStorage.setItem("crms_active_page", fallbackPage);
    }
  }, [activePage, currentRole]);

  const handleLogout = () => {
    localStorage.removeItem("crms_token");
    localStorage.removeItem("crms_user");
    localStorage.removeItem("crms_role");
    localStorage.removeItem("companyId");
    localStorage.removeItem("clientId");
    localStorage.removeItem("crms_active_page");
    localStorage.removeItem("crms_sidebar_mode");

    setUser(null);
    setIsLoggedIn(false);
    setActivePage("dashboard");
    setShowNotifications(false);
  };

  const handleLoginSuccess = (loginResponse) => {
    const normalizedRole = normalizeRole(loginResponse.role);

    const loggedInUser = {
      id: loginResponse.id,
      name: loginResponse.name,
      fullName: loginResponse.fullName || loginResponse.name,
      email: loginResponse.email,
      role: normalizedRole,
      token: loginResponse.token,
    };

    localStorage.setItem("crms_token", loginResponse.token);
    localStorage.setItem("crms_role", normalizedRole);
    localStorage.setItem("crms_user", JSON.stringify(loggedInUser));

    if (normalizedRole === ROLE.COMPANY && loginResponse.id) {
      localStorage.setItem("companyId", loginResponse.id);
    }

    if (normalizedRole === ROLE.CLIENT && loginResponse.id) {
      localStorage.setItem("clientId", loginResponse.id);
    }

    const defaultPage = DEFAULT_PAGE_BY_ROLE[normalizedRole] || "dashboard";
    localStorage.setItem("crms_active_page", defaultPage);

    setUser(loggedInUser);
    setIsLoggedIn(true);
    setActivePage(defaultPage);
    setShowNotifications(false);
  };

  const handleToggleSidebarMode = () => {
    const nextMode = sidebarMode === "expanded" ? "collapsed" : "expanded";
    setSidebarMode(nextMode);
    localStorage.setItem("crms_sidebar_mode", nextMode);
  };

  if (!isLoggedIn) {
    return <Auth onLogin={handleLoginSuccess} />;
  }

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return <Dashboard user={user} role={currentRole} />;
      case "projects":
        return <Projects user={user} role={currentRole} />;
      case "documents":
        return <Documents user={user} role={currentRole} />;
      case "change-requests":
        return <ChangeRequests user={user} role={currentRole} />;
      case "proposals":
        return <Proposals user={user} role={currentRole} />;
      case "kanban":
        return <Kanban user={user} role={currentRole} />;
      case "notifications":
        return <Notifications user={user} role={currentRole} />;
      case "settings":
        return <Settings user={user} role={currentRole} />;
      default:
        return <Dashboard user={user} role={currentRole} />;
    }
  };

  const pageInfo =
    PAGE_INFO[currentRole]?.[activePage] || {
      title: "Dashboard",
      subtitle: "",
    };

  return (
    <div className="relative flex h-screen overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.28),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.22),_transparent_35%)]" />

      <Sidebar
        activePage={activePage}
        onNavigate={safeSetActivePage}
        mode={sidebarMode}
        onToggleMode={handleToggleSidebarMode}
        onLogout={handleLogout}
        user={user}
        role={currentRole}
        allowedPages={allowedPages}
      />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          title={pageInfo.title}
          subtitle={pageInfo.subtitle}
          showNotifications={showNotifications}
          onToggleNotifications={() => setShowNotifications(!showNotifications)}
          onNavigateSettings={() => safeSetActivePage("settings")}
          onLogout={handleLogout}
          onProfileClick={() => setShowNotifications(true)}
          user={user}
          role={currentRole}
        />

        <main className="flex-1 overflow-y-auto bg-slate-50/95 p-6 md:p-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 rounded-[2rem] border border-white/80 bg-white/90 p-7 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl">
              <p className="mb-2 text-sm font-bold uppercase tracking-[0.28em] text-indigo-600">
                {currentRole === ROLE.CLIENT ? "Client Portal" : "Company Portal"}
              </p>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                {pageInfo.title}
              </h1>
              <p className="mt-3 max-w-2xl text-base font-medium text-slate-500">
                {pageInfo.subtitle}
              </p>
            </div>

            <div className="rounded-[2rem] border border-white bg-white/80 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl md:p-7">
              {renderPage()}
            </div>
          </div>
        </main>

        {showNotifications && (
          <NotificationPanel
            isOpen={showNotifications}
            notifications={[]}
            onClose={() => setShowNotifications(false)}
            onNotificationClick={() => setShowNotifications(false)}
          />
        )}
      </div>
    </div>
  );
};

const NotificationCard = ({ title, message, time, isNew }) => (
  <div className="rounded-3xl border border-white bg-white/95 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl">
    <div className="mb-2 flex items-start justify-between gap-4">
      <h4 className="text-sm font-black text-slate-950">{title}</h4>
      {isNew && (
        <span className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white">
          New
        </span>
      )}
    </div>

    <p className="mb-3 text-xs font-medium leading-relaxed text-slate-500">
      {message}
    </p>

    <div className="flex items-center text-[11px] font-bold text-slate-400">
      <svg
        className="mr-1 h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      {time}
    </div>
  </div>
);

export default App;