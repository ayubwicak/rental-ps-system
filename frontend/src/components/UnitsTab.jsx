import React, { useEffect, useRef } from "react";
import {
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
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">
          Kelola Unit POS
        </h1>
        <p style={{ color: C.textDim }} className="text-[13px] mt-1">
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
  let timerColor = C.text;
  if (isActive) {
    if (isPaused) {
      borderColor = C.warningBorder;
      timerColor = C.warning;
    } else if (isTimeUp) {
      borderColor = C.dangerBorder;
      timerColor = C.danger;
    } else if (isWarning) {
      borderColor = C.warningBorder;
      timerColor = C.warning;
    } else if (isPackageMode) {
      borderColor = C.successBorder;
      timerColor = C.success;
    } else {
      borderColor = C.primaryBorder;
      timerColor = C.primary;
    }
  }

  return (
    <Card className="relative" style={{ borderColor }}>
      {isTimeUp && <div className="absolute inset-x-0 top-0 h-1 rounded-t-xl" style={{ background: C.danger }} />}

      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="font-semibold text-[15px] truncate" style={{ color: C.text }}>{unit.name}</div>
          <div style={{ color: C.textDim }} className="text-xs mt-0.5">
            {unit.type} &middot; <span className="tabular">{fmtIDR(unit.rate)}/jam</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
          {upcomingBooking && (
            <Badge tone="warning">
              <Calendar size={11} className="shrink-0" /> {upcomingBooking.booking_time}
            </Badge>
          )}
          {isPackageMode && <Badge tone="neutral">Paket {session.package_hours}j</Badge>}
          <Badge tone={isPaused ? "warning" : isActive ? "primary" : "success"}>
            {isPaused ? "Paused" : isActive ? "Terpakai" : "Kosong"}
          </Badge>
        </div>
      </div>

      {isActive ? (
        <div>
          <div className="flex items-center justify-between text-xs mb-2 gap-2">
            <span style={{ color: C.textDim }} className="truncate">
              Pelanggan: <b style={{ color: C.text }}>{session.customer_name}</b>
            </span>
            {session.addons && session.addons.length > 0 && (
              <span style={{ color: C.primary }} className="flex items-center gap-1 font-medium shrink-0">
                <Coffee size={12} /> {session.addons.length} item
              </span>
            )}
          </div>

          <div
            style={{ background: C.surface2, border: `1px solid ${C.border}` }}
            className="my-2 p-3 rounded-lg flex flex-col items-center justify-center"
          >
            {isPackageMode ? (
              <>
                <div
                  className="text-[10px] uppercase font-semibold tracking-wider mb-1 flex items-center gap-1"
                  style={{ color: C.textDim }}
                >
                  <Clock size={11} /> Sisa waktu
                </div>
                <div className="tabular font-mono text-3xl font-semibold tracking-tight" style={{ color: timerColor }}>
                  {fmtClock(remainingSec)}
                </div>
                <div className="w-full h-1.5 rounded-full mt-2.5 overflow-hidden" style={{ background: C.border }}>
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
                <div
                  className="text-[10px] uppercase font-semibold tracking-wider mb-1"
                  style={{ color: C.textDim }}
                >
                  Waktu berjalan
                </div>
                <div className="tabular font-mono text-3xl font-semibold tracking-tight" style={{ color: timerColor }}>
                  {fmtClock(activeElapsedSec)}
                </div>
              </>
            )}
          </div>

          {isTimeUp && (
            <div
              style={{ background: C.dangerSoft, border: `1px solid ${C.dangerBorder}`, color: C.danger }}
              className="p-2 rounded-lg text-xs font-semibold text-center mb-3 flex items-center justify-center gap-1.5"
            >
              <Bell size={13} className="animate-pulse" /> Waktu sewa habis
            </div>
          )}

          <div style={{ color: C.textDim }} className="text-xs mb-3 flex justify-between">
            <span>Estimasi biaya</span>
            <span className="tabular font-semibold" style={{ color: C.success }}>
              {fmtIDR(runningCost + addonsCost)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            {isPaused ? (
              <Btn variant="secondary" icon={Play} onClick={onResume} className="w-full !text-xs">
                Resume
              </Btn>
            ) : (
              <Btn variant="secondary" icon={Pause} onClick={onPause} className="w-full !text-xs">
                Pause
              </Btn>
            )}
            <Btn variant="ghost" icon={ArrowRightLeft} onClick={onSwitch} className="w-full !text-xs">
              Pindah
            </Btn>
          </div>

          <Btn variant="subtle" icon={Coffee} onClick={onManageAddons} className="w-full mb-2 !text-xs">
            Kantin &amp; Snack ({session.addons ? session.addons.length : 0})
          </Btn>

          <Btn variant="danger" icon={Square} onClick={onStop} className="w-full">
            Stop &amp; Bayar
          </Btn>
        </div>
      ) : (
        <div>
          <div
            style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.textFaint }}
            className="h-[72px] rounded-lg flex items-center justify-center text-xs mb-3"
          >
            Unit siap disewakan
          </div>
          <Btn icon={Play} onClick={onStart} className="w-full">
            Mulai Sewa
          </Btn>
        </div>
      )}
    </Card>
  );
}
