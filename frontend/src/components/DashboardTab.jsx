import React from "react";
import {
  Zap,
  Wallet,
  Receipt,
  Gamepad2,
  Users,
  Clock,
  ArrowRight,
  TrendingUp,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { C } from "../styles/tokens.js";
import { Card, Badge, StatCard, Btn } from "./ui.jsx";
import { fmtIDR, fmtClock, fmtDateTimeWIB } from "../utils/format.js";

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
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold truncate">Dashboard Rental</h1>
          <p style={{ color: C.textDim }} className="text-xs sm:text-sm mt-0.5 sm:mt-1 truncate sm:whitespace-normal">
            Statistik performa &amp; sesi aktif hari ini.
          </p>
        </div>
        <Btn icon={ArrowRight} onClick={onGoToUnits} className="shrink-0">
          <span className="inline">Kelola Unit</span>
        </Btn>
      </header>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard icon={Wallet} label="Omset Hari Ini" value={fmtIDR(todayRevenue)} tone={C.mint} />
        <StatCard icon={Receipt} label="Transaksi" value={todayCount} tone={C.violet} />
        <StatCard icon={Zap} label="Unit Terpakai" value={`${activeUnits.length}/${units.length}`} tone={C.coral} />
        <StatCard icon={Users} label="Member" value={membersCount} tone={C.gold} />
      </div>

      {/* Ringkasan Status Unit */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-base sm:text-lg flex items-center gap-2">
            <Gamepad2 size={18} className="text-violet-400 shrink-0" /> Bilik PS
          </h2>
          <span className="text-xs" style={{ color: C.textDim }}>
            <b className="text-emerald-400">{idleUnitsCount} Kosong</b> &middot;{" "}
            <b className="text-coral-400">{activeUnits.length} Terpakai</b>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {units.map((u) => {
            const session = u.session;
            const isActive = Boolean(session && (session.status === "active" || session.status === "paused"));
            const isPaused = session?.status === "paused";

            return (
              <div
                key={u.id}
                onClick={onGoToUnits}
                className="p-3 rounded-xl border flex flex-col justify-between cursor-pointer hover:border-violet-500/50 transition-all bg-gray-900/40"
                style={{ borderColor: isActive ? (isPaused ? "#f59e0b" : C.violet) : C.border }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm truncate">{u.name}</span>
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isPaused ? "bg-amber-400" : isActive ? "bg-emerald-400 animate-pulse" : "bg-gray-600"
                    }`}
                  />
                </div>
                <div className="text-[11px]" style={{ color: C.textDim }}>
                  {u.type}
                </div>
                <div className="mt-2 text-xs font-semibold">
                  {isActive ? (
                    <span className="text-violet-300 truncate block">{session.customer_name}</span>
                  ) : (
                    <span className="text-gray-500 font-normal">Siap Sewa</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabel Sesi Berjalan & Ringkasan Aktivitas */}
      <Card>
        <div className="flex items-center justify-between mb-4 gap-2">
          <div className="font-display font-bold text-base sm:text-lg flex items-center gap-2 truncate">
            <Activity size={18} className="text-emerald-400 shrink-0" /> Sesi Aktif
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20 shrink-0">
            {activeUnits.length} Berjalan
          </span>
        </div>

        {activeUnits.length === 0 ? (
          <div className="text-center py-6 text-xs" style={{ color: C.textDim }}>
            <CheckCircle2 size={24} className="mx-auto mb-2 opacity-40 text-emerald-400" />
            Semua bilik PS saat ini sedang kosong.
          </div>
        ) : (
          <div className="overflow-x-auto -mx-1 sm:mx-0">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400">
                  <th className="pb-2.5 pr-2">UNIT</th>
                  <th className="pb-2.5 pr-2">PELANGGAN</th>
                  <th className="pb-2.5 pr-2">MODE</th>
                  <th className="pb-2.5 pr-2">MULAI</th>
                  <th className="pb-2.5 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {activeUnits.map((u) => {
                  const s = u.session;
                  return (
                    <tr key={u.id} className="hover:bg-gray-800/20">
                      <td className="py-2.5 pr-2 font-bold text-white whitespace-nowrap">{u.name}</td>
                      <td className="py-2.5 pr-2 font-medium truncate max-w-[100px]">{s.customer_name}</td>
                      <td className="py-2.5 pr-2 capitalize whitespace-nowrap">
                        {s.duration_mode === "package" ? (
                          <span className="text-violet-400 font-semibold">{s.package_hours} Jam</span>
                        ) : (
                          <span className="text-gray-400">Open</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-2 font-mono whitespace-nowrap" style={{ color: C.textDim }}>
                        {fmtDateTimeWIB(s.start_time)}
                      </td>
                      <td className="py-2.5 text-right whitespace-nowrap">
                        <Badge tone={s.status === "paused" ? "idle" : "active"}>
                          {s.status.toUpperCase()}
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
