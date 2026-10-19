import React from "react";
import {
  Zap,
  Wallet,
  Receipt,
  Gamepad2,
  Users,
  Activity,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { C } from "../styles/tokens.js";
import { Card, Badge, StatCard, Btn } from "./ui.jsx";
import { fmtIDR, fmtDateTimeWIB } from "../utils/format.js";

export default function DashboardTab({
  units = [],
  membersCount = 0,
  todayRevenue = 0,
  todayCount = 0,
  now,
  onGoToUnits,
}) {
  const activeUnits = units.filter(
    (u) => u.status === "active" || u.session?.status === "active" || u.session?.status === "paused"
  );
  const idleUnitsCount = units.length - activeUnits.length;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">Dashboard</h1>
          <p style={{ color: C.textDim }} className="text-[13px] mt-1">
            Ringkasan performa dan sesi aktif hari ini.
          </p>
        </div>
        <Btn icon={ArrowRight} onClick={onGoToUnits} className="shrink-0">
          Kelola Unit
        </Btn>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={Wallet} label="Omset Hari Ini" value={fmtIDR(todayRevenue)} tone={C.success} />
        <StatCard icon={Receipt} label="Transaksi" value={todayCount} tone={C.primary} />
        <StatCard icon={Zap} label="Unit Terpakai" value={`${activeUnits.length}/${units.length}`} tone={C.warning} />
        <StatCard icon={Users} label="Member" value={membersCount} tone={C.primaryDark} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-[15px] flex items-center gap-2">
            <Gamepad2 size={17} style={{ color: C.primary }} /> Status Bilik PS
          </h2>
          <span className="text-xs" style={{ color: C.textDim }}>
            <b style={{ color: C.success }}>{idleUnitsCount} kosong</b> &middot;{" "}
            <b style={{ color: C.primary }}>{activeUnits.length} terpakai</b>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {units.map((u) => {
            const session = u.session;
            const isActive = Boolean(session && (session.status === "active" || session.status === "paused"));
            const isPaused = session?.status === "paused";

            return (
              <button
                key={u.id}
                type="button"
                onClick={onGoToUnits}
                style={{ background: C.surface, border: `1px solid ${C.border}` }}
                className="p-3 rounded-lg text-left flex flex-col justify-between hover:border-[var(--c-borderStrong)] hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1 gap-1">
                  <span className="font-semibold text-sm truncate" style={{ color: C.text }}>
                    {u.name}
                  </span>
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: isPaused ? C.warning : isActive ? C.primary : C.success }}
                  />
                </div>
                <div className="text-[11px]" style={{ color: C.textFaint }}>
                  {u.type}
                </div>
                <div className="mt-2 text-xs font-medium truncate">
                  {isActive ? (
                    <span style={{ color: C.primaryDark }}>{session.customer_name}</span>
                  ) : (
                    <span className="font-normal" style={{ color: C.textFaint }}>Siap sewa</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4 gap-2">
          <div className="font-semibold text-[15px] flex items-center gap-2 truncate">
            <Activity size={17} style={{ color: C.success }} /> Sesi Aktif
          </div>
          <Badge tone="primary">{activeUnits.length} berjalan</Badge>
        </div>

        {activeUnits.length === 0 ? (
          <div className="text-center py-6 text-[13px] flex flex-col items-center gap-2" style={{ color: C.textDim }}>
            <CheckCircle2 size={22} style={{ color: C.success }} />
            Semua bilik PS saat ini sedang kosong.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-1 sm:mx-0">
            <table className="w-full text-left text-xs">
              <thead>
                <tr style={{ color: C.textDim }} className="border-b" >
                  <th className="pb-2.5 pr-3 font-medium">Unit</th>
                  <th className="pb-2.5 pr-3 font-medium">Pelanggan</th>
                  <th className="pb-2.5 pr-3 font-medium">Mode</th>
                  <th className="pb-2.5 pr-3 font-medium">Mulai</th>
                  <th className="pb-2.5 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {activeUnits.map((u) => {
                  const s = u.session;
                  return (
                    <tr key={u.id} className="border-b last:border-0" style={{ borderColor: C.inset }}>
                      <td className="py-2.5 pr-3 font-semibold whitespace-nowrap" style={{ color: C.text }}>
                        {u.name}
                      </td>
                      <td className="py-2.5 pr-3 font-medium truncate max-w-[120px]" style={{ color: C.text }}>
                        {s.customer_name}
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap">
                        {s.duration_mode === "package" ? (
                          <span style={{ color: C.primary }} className="font-medium">{s.package_hours} Jam</span>
                        ) : (
                          <span style={{ color: C.textDim }}>Open</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 tabular whitespace-nowrap" style={{ color: C.textDim }}>
                        {fmtDateTimeWIB(s.start_time)}
                      </td>
                      <td className="py-2.5 text-right whitespace-nowrap">
                        <Badge tone={s.status === "paused" ? "warning" : "primary"}>
                          {s.status === "paused" ? "Paused" : "Berjalan"}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
