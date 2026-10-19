import React from "react";
import { Menu, Clock, Sun, Moon } from "lucide-react";
import { C } from "../styles/tokens.js";
import { NAV } from "./Sidebar.jsx";
import { fmtTimeWIB } from "../utils/format.js";

export default function TopBar({ tab, now, isMobile, onOpenDrawer, theme, onToggleTheme }) {
  const activeNav = NAV.find((n) => n.key === tab);
  const isDark = theme === "dark";
  return (
    <div
      style={{ borderBottom: `1px solid ${C.border}`, background: C.surface }}
      className="flex items-center justify-between px-3.5 sm:px-6 md:px-8 py-3 sticky top-0 z-20"
    >
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {isMobile && (
          <button
            type="button"
            onClick={onOpenDrawer}
            style={{ background: C.inset, color: C.text }}
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 hover:brightness-95 active:scale-95 transition-all"
            aria-label="Buka menu"
          >
            <Menu size={18} />
          </button>
        )}
        <span
          className="font-semibold text-sm sm:text-base truncate max-w-[170px] sm:max-w-none"
          style={{ color: C.text }}
        >
          {activeNav?.label}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div
          style={{ color: C.textDim, background: C.inset }}
          className="tabular text-xs font-medium px-2.5 py-1.5 rounded-lg flex items-center gap-1.5"
        >
          <Clock size={13} className="shrink-0" style={{ color: C.textFaint }} />
          {fmtTimeWIB(now)}
        </div>
        <button
          type="button"
          onClick={onToggleTheme}
          style={{ background: C.inset, color: C.textDim }}
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 hover:brightness-95 active:scale-95 transition-all"
          title={isDark ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
          aria-label={isDark ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </div>
  );
}
