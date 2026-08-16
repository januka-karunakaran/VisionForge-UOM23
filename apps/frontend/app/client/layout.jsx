/* eslint-disable react/prop-types */

"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import TopNavbar from "../../components/TopNavbar";
import AppSidebar from "../../components/AppSidebar";

export default function ClientLayout({ children }) {
  const pathname = usePathname();
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);

  return (
    <div
      className="flex h-screen bg-slate-100 dark:bg-slate-950 overflow-hidden transition-colors duration-300"
    >
      {desktopSidebarOpen && <AppSidebar section="client" />}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <TopNavbar
        section="client"
          pathname={pathname}
          desktopSidebarOpen={desktopSidebarOpen}
          setDesktopSidebarOpen={setDesktopSidebarOpen}
        />
        <main className="flex-1 overflow-y-auto p-8 bg-slate-100 dark:bg-slate-950 transition-colors duration-300">{children}</main>
      </div>
    </div>
  );
}
