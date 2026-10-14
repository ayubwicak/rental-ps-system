import React from "react";
import { Menu } from "lucide-react";
import { C } from "../styles/tokens.js";
import { NAV } from "./Sidebar.jsx";
import { fmtTimeWIB } from "../utils/format.js";

export default function TopBar({ tab, now, isMobile, onOpenDrawer }) {
  const activeNav = NAV.find((n) => n.key === tab);
  return (
    <div
      style={{ borderBottom: `1px solid ${C.border}`, background: C.bg }}
      className="flex items-center justify-between px-3.5 sm:px-6 md:px-8 py-3 sm:py-4 sticky top-0 z-20"
    >
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {isMobile && (
          <button
            type="button"
            onClick={onOpenDrawer}
            style={{ background: C.surface2, color: C.text }}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0 hover:brightness-110 active:scale-95 transition-all"
          >
            <Menu size={18} />
          </button>
        )}
        <span
          className="font-display font-semibold text-xs sm:text-sm truncate max-w-[150px] sm:max-w-none"
          style={{ color: C.textDim }}
        >
          {activeNav?.label}
        </span>
      </div>
      <div
        style={{ color: C.textDim }}
        className="font-mono text-[11px] sm:text-xs font-semibold text-violet-400 shrink-0"
      >
        {fmtTimeWIB(now)}
      </div>
    </div>
  );
}
