"use client";

export default function Layout({ title, children }) {
  return (
    <section className="relative min-h-screen w-full bg-[#f8fafc]">

      {/* 🔥 TOP SPACING FIX */}
      <div className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6">

        {/* PAGE TITLE */}
        {title && (
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {title}
            </h1>
            <div className="mt-2 h-[2px] w-20 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-full" />
          </div>
        )}

        {/* CONTENT */}
        <div className="space-y-6">
          {children}
        </div>

      </div>

    </section>
  );
}