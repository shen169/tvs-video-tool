"use client";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "新建视频", icon: "＋", active: true },
  { href: "/history", label: "历史记录", icon: "⎗" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 h-screen glass border-r border-[#1f1f24] flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-5 border-b border-[#1f1f24]">
        <div className="w-7 h-7 rounded-md bg-emerald-600 flex items-center justify-center text-xs font-bold text-white">T</div>
        <span className="font-semibold text-sm tracking-wide text-zinc-200">TVS Video</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                active
                  ? "bg-emerald-600/10 text-emerald-400 font-medium border border-emerald-600/20"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]"
              }`}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-[#1f1f24]">
        <p className="text-[10px] text-zinc-600 tracking-wide">TVS Video Tool v2</p>
      </div>
    </aside>
  );
}
