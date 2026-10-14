import React, { useState } from "react";
import {
  Gamepad2,
  LogOut,
  LayoutDashboard,
  CalendarCheck,
  History,
  Users,
  BarChart3,
  Coffee,
  ShieldCheck,
} from "lucide-react";
import { C } from "../styles/tokens.js";
import { Btn, Modal } from "./ui.jsx";

export const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "units", label: "Kelola Unit POS", icon: Gamepad2 },
  { key: "kantin", label: "Kantin & Stok", icon: Coffee },
  { key: "booking", label: "Booking", icon: CalendarCheck },
  { key: "riwayat", label: "Riwayat", icon: History },
  { key: "member", label: "Member", icon: Users },
  { key: "laporan", label: "Laporan", icon: BarChart3 },
  { key: "users", label: "Pengaturan", icon: ShieldCheck },
];

export default function Sidebar({
  tab,
  setTab,
  user,
  onLogout,
  isMobile,
  drawerOpen,
  setDrawerOpen,
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const sidebarWidth = 232;

  return (
    <>
      {isMobile && drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{ background: "rgba(8,6,14,0.65)" }}
          className="fixed inset-0 z-40"
        />
      )}
      <aside
        style={{
          borderRight: `1px solid ${C.border}`,
          background: C.bg,
          width: sidebarWidth,
          flexShrink: 0,
          ...(isMobile
            ? {
                position: "fixed",
                top: 0,
                bottom: 0,
                left: 0,
                zIndex: 50,
                transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
                transition: "transform 0.25s ease",
              }
            : {}),
        }}
        className="flex flex-col py-6"
      >
        <div className="flex items-center gap-2 px-5 mb-8">
          <div
            style={{ background: C.violet }}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/20"
          >
            <Gamepad2 size={20} color="#fff" />
          </div>
          <span className="font-display font-bold text-lg whitespace-nowrap tracking-tight">
            RentalKu <span className="text-xs text-violet-400 font-normal">v2.0</span>
          </span>
        </div>

        <nav className="flex flex-col gap-1 px-3">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = tab === n.key;
            return (
              <button
                key={n.key}
                onClick={() => {
                  setTab(n.key);
                  if (isMobile) setDrawerOpen(false);
                }}
                style={{
                  background: active ? "rgba(139,107,255,0.15)" : "transparent",
                  color: active ? C.violet : C.textDim,
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold hover:brightness-125 justify-start whitespace-nowrap transition-colors"
              >
                <Icon size={18} className={active ? "text-violet-400" : "text-gray-400"} />
                {n.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto px-3 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
            <div
              style={{ background: C.violetDim }}
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 text-violet-300"
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{user.name}</div>
              <div style={{ color: C.textDim }} className="text-xs capitalize">
                {user.role}
              </div>
            </div>
          </div>
          <button
            onClick={() => setConfirmOpen(true)}
            style={{ color: C.coral }}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl text-sm font-semibold hover:brightness-125 transition-opacity"
          >
            <LogOut size={16} />
            Keluar
          </button>
        </div>
      </aside>

      {confirmOpen && (
        <Modal title="Keluar dari sistem?" onClose={() => setConfirmOpen(false)} width="max-w-xs">
          <p style={{ color: C.textDim }} className="text-sm mb-5">
            Sesi <span style={{ color: C.text }} className="font-semibold">{user.name}</span> akan diakhiri.
          </p>
          <div className="flex gap-2">
            <Btn variant="ghost" className="flex-1" onClick={() => setConfirmOpen(false)}>
              Batal
            </Btn>
            <Btn variant="danger" className="flex-1" icon={LogOut} onClick={onLogout}>
              Keluar
            </Btn>
          </div>
        </Modal>
      )}
    </>
  );
}
