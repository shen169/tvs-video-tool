"use client";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "New Video", icon: "M12 4.5v15m7.5-7.5h-15", active: true },
  { href: "/history", label: "History", icon: "M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" },
];

export default function Sidebar() {
  const pathname = usePathname();

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
      </nav>

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
