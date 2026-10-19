import React from "react";
import { LayoutDashboard, Gamepad2, CalendarCheck, Coffee, Menu } from "lucide-react";
import { C } from "../styles/tokens.js";

export default function BottomNav({ tab, setTab, onOpenDrawer }) {
  const items = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "units", label: "Unit POS", icon: Gamepad2 },
    { key: "booking", label: "Booking", icon: CalendarCheck },
    { key: "kantin", label: "Kantin", icon: Coffee },
  ];

  return (
    <div
      style={{
        background: C.surface,
        borderTop: `1px solid ${C.border}`,
      }}
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-stretch justify-around px-1 py-1.5"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = tab === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className="flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-lg transition-colors"
            style={{
              color: active ? C.primary : C.textDim,
              background: active ? C.primarySoft : "transparent",
            }}
          >
            <Icon size={19} />
            <span className="text-[10px] font-medium mt-0.5 tracking-tight truncate max-w-[64px]">
              {item.label}
            </span>
          </button>
        );
      })}

      <button
        type="button"
        onClick={onOpenDrawer}
        style={{ color: C.textDim }}
        className="flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-lg hover:bg-[var(--c-inset)] transition-colors"
      >
        <Menu size={19} />
        <span className="text-[10px] font-medium mt-0.5 tracking-tight">Lainnya</span>
      </button>
    </div>
  );
}
