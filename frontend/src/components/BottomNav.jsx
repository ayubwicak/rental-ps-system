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
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around px-2 py-2 shadow-2xl backdrop-blur-lg"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = tab === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className="flex flex-col items-center justify-center flex-1 py-1 px-1 transition-colors"
            style={{
              color: active ? C.violet : C.textDim,
            }}
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                active ? "bg-violet-500/20 scale-105" : ""
              }`}
            >
              <Icon size={20} className={active ? "text-violet-400" : "text-gray-400"} />
            </div>
            <span className="text-[10px] font-semibold mt-0.5 tracking-tight truncate max-w-[64px]">
              {item.label}
            </span>
          </button>
        );
      })}

      <button
        type="button"
        onClick={onOpenDrawer}
        className="flex flex-col items-center justify-center flex-1 py-1 px-1 text-gray-400 hover:text-white transition-colors"
      >
        <div className="p-1.5 rounded-xl">
          <Menu size={20} className="text-gray-400" />
        </div>
        <span className="text-[10px] font-semibold mt-0.5 tracking-tight">
          Lainnya
        </span>
      </button>
    </div>
  );
}
