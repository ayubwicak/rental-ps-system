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
  { key: "users", label: "Pengaturan", icon: ShieldCheck, adminOnly: true },
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
          style={{ background: "rgba(15,23,42,0.4)" }}
          className="fixed inset-0 z-40"
        />
      )}
      <aside
        style={{
          borderRight: `1px solid ${C.border}`,
          background: C.surface,
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
                transition: "transform 0.2s ease",
              }
            : {}),
        }}
        className="flex flex-col py-5"
      >
        <div className="flex items-center gap-2.5 px-4 mb-7">
          <div
            style={{ background: C.primary }}
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          >
            <Gamepad2 size={19} color="#fff" />
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-[15px] tracking-tight" style={{ color: C.text }}>
              RentalKu
            </div>
            <div className="text-[11px]" style={{ color: C.textFaint }}>
              Sistem Penyewaan PS
            </div>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5 px-3">
          {NAV.filter((n) => !n.adminOnly || user.role === "admin").map((n) => {
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
                  background: active ? C.primarySoft : "transparent",
                  color: active ? C.primaryDark : C.textDim,
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm justify-start whitespace-nowrap transition-colors ${
                  active ? "font-semibold" : "font-medium hover:bg-[var(--c-inset)] hover:text-[var(--c-text)]"
                }`}
              >
                <Icon size={18} className="shrink-0" />
                {n.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto px-3 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
            <div
              style={{ background: C.primarySoft, color: C.primaryDark }}
              className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs flex-shrink-0"
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate" style={{ color: C.text }}>
                {user.name}
              </div>
              <div style={{ color: C.textFaint }} className="text-xs capitalize">
                {user.role}
              </div>
            </div>
          </div>
          <button
            onClick={() => setConfirmOpen(true)}
            style={{ color: C.textDim }}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium hover:bg-red-50 hover:text-red-600 transition-colors"
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
