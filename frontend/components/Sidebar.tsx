"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getMe, getStoredToken } from "@/lib/api";
import UserStatus from "@/components/UserStatus";

const NAV = [
  { href: "/app", label: "New Video", icon: "M12 4.5v15m7.5-7.5h-15" },
  { href: "/history", label: "History", icon: "M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" },
  { href: "/credits", label: "Credits", icon: "M12 6v12m-3-2.818.879.659c1.171.879 3.07 1.979 4.242 1.979.208 0 .417-.012.624-.036M20.25 3.75l-7.5 7.5M3.75 20.25l7.5-7.5" },
  { href: "/features", label: "How It Works", icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" },
];

const ADMIN_NAV = { href: "/admin", label: "Admin", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" };

export default function Sidebar() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!getStoredToken()) return;
    getMe().then(u => setIsAdmin(u.role === "admin")).catch(() => {});
  }, []);

  return (
    <aside className="w-60 h-screen glass flex flex-col flex-shrink-0 select-none">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <svg className="w-5 h-5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </svg>
        </div>
        <div>
          <span className="font-bold text-sm tracking-tight text-zinc-100">TVS</span>
          <span className="font-medium text-sm tracking-tight text-zinc-400"> Video</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-5 space-y-1">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/15 shadow-sm shadow-amber-500/5"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] border border-transparent"
              }`}
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
              </svg>
              <span>{item.label}</span>
            </a>
          );
        })}

        {/* Admin link — only for admin users */}
        {isAdmin && (
          <a
            href={ADMIN_NAV.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              pathname.startsWith("/admin")
                ? "bg-purple-500/10 text-purple-400 border border-purple-500/15 shadow-sm shadow-purple-500/5"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] border border-transparent"
            }`}
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={ADMIN_NAV.icon} />
            </svg>
            <span>Admin</span>
          </a>
        )}
      </nav>

      {/* User Status */}
      <div className="px-5 py-3">
        <UserStatus />
      </div>

      {/* Separator */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent" />

      {/* Footer */}
      <div className="px-5 py-4">
        <p className="text-[10px] text-zinc-600 tracking-wide uppercase">
          TVS Video Tool v2
        </p>
        <p className="text-[10px] text-zinc-700 mt-0.5">
          AI-Powered Commerce
        </p>
      </div>
    </aside>
  );
}
