import React, { useEffect, useRef } from "react";
import {
  Zap,
  Play,
  Square,
  Pause,
  ArrowRightLeft,
  Clock,
  Bell,
  Coffee,
  Calendar,
} from "lucide-react";
import { C } from "../styles/tokens.js";
import { Card, Badge, Btn } from "./ui.jsx";
import { fmtIDR, fmtClock } from "../utils/format.js";

// Web Audio API Beep Alarm
function playAlarmSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {}
}

export default function UnitsTab({
  units,
  bookings = [],
  now,
  onStart,
  onStop,
  onPause,
  onResume,
  onSwitch,
  onManageAddons,
}) {
  const today = new Date().toISOString().split("T")[0];

  return (
    <div>
      <header className="mb-5">
        <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold truncate">
          Kelola Unit POS
        </h1>
        <p style={{ color: C.textDim }} className="text-xs sm:text-sm mt-0.5 sm:mt-1">
          Kontrol sewa bilik PS, timer, dan tagihan kasir.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {units.map((u) => {
          const upcomingBooking = bookings.find(
            (b) => b.unit_id === u.id && (b.status === "terjadwal" || b.status === "menunggu") && b.booking_date === today
          );
          return (
            <UnitCard
              key={u.id}
              unit={u}
              upcomingBooking={upcomingBooking}
              now={now}
              onStart={() => onStart(u)}
              onStop={() => onStop(u)}
              onPause={() => onPause(u)}
              onResume={() => onResume(u)}
              onSwitch={() => onSwitch(u)}
              onManageAddons={() => onManageAddons(u)}
            />
          );
        })}
      </div>
    </div>
  );
}

function UnitCard({ unit, upcomingBooking, now, onStart, onStop, onPause, onResume, onSwitch, onManageAddons }) {
  const session = unit.session;
  const isActive = Boolean(session && (session.status === "active" || session.status === "paused"));
  const isPaused = session?.status === "paused";

  const startMs = isActive ? new Date(session.start_time + "Z").getTime() : 0;
  let pausedSec = session?.total_paused_sec || 0;
  if (isPaused && session.paused_at) {
    pausedSec += Math.floor((now - new Date(session.paused_at + "Z").getTime()) / 1000);
  }

  const rawDurationSec = isActive ? Math.max(0, Math.floor((now - startMs) / 1000)) : 0;
  const activeElapsedSec = Math.max(0, rawDurationSec - pausedSec);

  const isPackageMode = session?.duration_mode === "package" && session?.package_hours > 0;
  const targetTotalSec = isPackageMode ? Math.round(session.package_hours * 3600) : 0;
  const remainingSec = isPackageMode ? Math.max(0, targetTotalSec - activeElapsedSec) : 0;

  const isTimeUp = isPackageMode && activeElapsedSec >= targetTotalSec;
  const isWarning = isPackageMode && !isTimeUp && remainingSec <= 900;

  const prevTimeUpRef = useRef(false);
  useEffect(() => {
    if (isTimeUp && !prevTimeUpRef.current) {
      playAlarmSound();
    }
    prevTimeUpRef.current = isTimeUp;
  }, [isTimeUp]);

  let runningCost = 0;
  if (isActive) {
    if (isPackageMode) {
      runningCost = session.package_hours * unit.rate;
    } else {
      runningCost = (activeElapsedSec / 3600) * unit.rate;
    }
  }

  const addonsCost = (session?.addons || []).reduce((s, a) => s + a.price * a.qty, 0);

  let borderColor = C.border;
  let timerColor = C.coral;
  if (isActive) {
    if (isPaused) {
      borderColor = "rgba(245,158,11,0.5)";
      timerColor = "#f59e0b";
    } else if (isTimeUp) {
      borderColor = "rgba(239,68,68,0.8)";
      timerColor = "#ef4444";
    } else if (isWarning) {
      borderColor = "rgba(245,158,11,0.8)";
      timerColor = "#f59e0b";
    } else if (isPackageMode) {
      borderColor = "rgba(16,185,129,0.5)";
      timerColor = "#10b981";
    } else {
      borderColor = "rgba(139,107,255,0.5)";
      timerColor = C.violet;
    }
  }

  return (
    <Card
      className={`relative overflow-hidden scanline transition-all ${
        isTimeUp ? "animate-pulse" : ""
      }`}
      style={{ borderColor }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="font-display font-bold text-base sm:text-lg truncate">{unit.name}</div>
          <div style={{ color: C.textDim }} className="text-xs">
            {unit.type} &middot; {fmtIDR(unit.rate)}/jam
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
          {upcomingBooking && (
            <Badge tone="coral">
              <Calendar size={12} className="inline shrink-0 mr-1" /> {upcomingBooking.booking_time} ({upcomingBooking.customer_name})
            </Badge>
          )}
          {isPackageMode && (
            <Badge tone="violet">Paket {session.package_hours}j</Badge>
          )}
          <Badge tone={isPaused ? "idle" : isActive ? "active" : "idle"}>
            {isPaused ? "Paused" : isActive ? "Terpakai" : "Kosong"}
          </Badge>
        </div>
      </div>

      {isActive ? (
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span style={{ color: C.textDim }} className="font-medium truncate max-w-[180px]">
              Pelanggan: <b className="text-white">{session.customer_name}</b>
            </span>
            {session.addons && session.addons.length > 0 && (
              <span className="text-violet-400 flex items-center gap-1 font-medium shrink-0">
                <Coffee size={12} /> {session.addons.length} Addon
              </span>
            )}
          </div>

          <div className="my-2 p-3 rounded-xl bg-gray-950/60 border border-gray-800/80 flex flex-col items-center justify-center">
            {isPackageMode ? (
              <>
                <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-0.5 flex items-center gap-1">
                  <Clock size={12} /> Sisa Waktu
                </div>
                <div
                  className="font-mono text-2xl sm:text-3xl font-extrabold tracking-wider"
                  style={{ color: timerColor }}
                >
                  {fmtClock(remainingSec)}
                </div>
                <div className="w-full bg-gray-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full transition-all duration-500 rounded-full"
                    style={{
                      width: `${Math.min(100, (activeElapsedSec / targetTotalSec) * 100)}%`,
                      backgroundColor: timerColor,
                    }}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mb-0.5">
                  Waktu Berjalan
                </div>
                <div
                  className="font-mono text-2xl sm:text-3xl font-extrabold tracking-wider"
                  style={{ color: timerColor }}
                >
                  {fmtClock(activeElapsedSec)}
                </div>
              </>
            )}
          </div>

          {isTimeUp && (
            <div className="p-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold text-center mb-3 flex items-center justify-center gap-1.5">
              <Bell size={14} className="animate-bounce" /> WAKTU SEWA HABIS!
            </div>
          )}

          <div style={{ color: C.textDim }} className="text-xs mb-3 flex justify-between">
            <span>Estimasi Biaya:</span>
            <span className="font-semibold text-emerald-400">
              {fmtIDR(runningCost + addonsCost)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            {isPaused ? (
              <Btn variant="secondary" icon={Play} onClick={onResume} className="w-full py-1.5 text-xs">
                Resume
              </Btn>
            ) : (
              <Btn variant="secondary" icon={Pause} onClick={onPause} className="w-full py-1.5 text-xs">
                Pause
              </Btn>
            )}
            <Btn variant="ghost" icon={ArrowRightLeft} onClick={onSwitch} className="w-full py-1.5 text-xs">
              Pindah
            </Btn>
          </div>

          <Btn variant="secondary" icon={Coffee} onClick={onManageAddons} className="w-full mb-2 text-xs py-1.5">
            + Kantin / Snack ({session.addons ? session.addons.length : 0})
          </Btn>

          <Btn variant="danger" icon={Square} onClick={onStop} className="w-full py-2 text-xs sm:text-sm">
            Stop &amp; Bayar
          </Btn>
        </div>
      ) : (
        <div>
          <div className="h-[74px] flex items-center justify-center text-center" style={{ color: C.textDim }}>
            <span className="text-xs">Unit siap disewakan</span>
          </div>
          <Btn icon={Play} onClick={onStart} className="w-full mt-2 py-2 text-xs sm:text-sm">
            Mulai Sewa
          </Btn>
        </div>
      )}
    </Card>
  );
}
