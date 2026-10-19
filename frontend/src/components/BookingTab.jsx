import React, { useState } from "react";
import { Plus, Calendar, ArrowRightLeft, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { C, inputStyle } from "../styles/tokens.js";
import { Card, Badge, Btn, Modal, Field, EmptyState } from "./ui.jsx";

export default function BookingTab({ units, bookings, onAdd, onCheckIn, onSwitchUnit }) {
  const [checkInModalBooking, setCheckInModalBooking] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const displayedBookings = showCompleted
    ? bookings
    : bookings.filter((b) => b.status !== "selesai");

  return (
    <div>
      <header className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">
            Booking &amp; Reservasi
          </h1>
          <p style={{ color: C.textDim }} className="text-[13px] mt-1">
            Jadwal dan reservasi rental.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setShowCompleted(!showCompleted)}
            className="text-xs px-3 py-2 rounded-lg font-medium transition-colors whitespace-nowrap"
            style={{
              border: `1px solid ${showCompleted ? C.primaryBorder : C.border}`,
              color: showCompleted ? C.primaryDark : C.textDim,
              background: showCompleted ? C.primarySoft : C.surface,
            }}
          >
            {showCompleted ? "Aktif Saja" : "Semua Status"}
          </button>
          <Btn icon={Plus} onClick={onAdd} className="shrink-0">
            Buat Booking
          </Btn>
        </div>
      </header>

      {displayedBookings.length === 0 ? (
        <EmptyState text={showCompleted ? "Belum ada booking." : "Tidak ada reservasi aktif yang menunggu check-in."} />
      ) : (
        <div className="flex flex-col gap-3">
          {displayedBookings.map((b) => {
            const unit = units.find((u) => u.id === b.unit_id);
            const isUnitActive = unit?.status === "active";
            const isPending = b.status === "terjadwal" || b.status === "menunggu";

            return (
              <Card key={b.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-sm flex items-center gap-2" style={{ color: C.text }}>
                    <span className="truncate">{b.customer_name}</span>
                    <span style={{ color: C.textFaint }}>&middot;</span>
                    <span className="font-semibold shrink-0" style={{ color: C.primaryDark }}>{b.unit_name}</span>
                  </div>
                  <div style={{ color: C.textDim }} className="text-xs mt-1.5 flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1.5 tabular">
                      <Calendar size={13} className="shrink-0" style={{ color: C.textFaint }} />
                      {b.booking_date}
                    </span>
                    <span className="flex items-center gap-1.5 tabular">
                      <Clock size={13} className="shrink-0" style={{ color: C.textFaint }} />
                      {b.booking_time} ({b.duration_hours || 1}j)
                    </span>
                    {isPending && isUnitActive && (
                      <span className="font-medium flex items-center gap-1" style={{ color: C.warning }}>
                        <AlertCircle size={12} /> Bilik dipakai
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className="flex items-center justify-between sm:justify-end gap-2 pt-2.5 sm:pt-0 shrink-0"
                  style={{ borderTop: `1px solid ${C.inset}` }}
                >
                  <Badge tone={b.status === "selesai" ? "neutral" : isUnitActive ? "warning" : "success"}>
                    {b.status === "selesai" ? "Selesai" : isUnitActive ? "Bilik Terpakai" : b.status === "terjadwal" ? "Terjadwal" : "Menunggu"}
                  </Badge>

                  {isPending && (
                    <Btn
                      variant={isUnitActive ? "secondary" : "primary"}
                      className="!py-1.5 !px-3 !text-xs"
                      onClick={() => {
                        if (isUnitActive) {
                          setCheckInModalBooking(b);
                        } else {
                          onCheckIn(b.id);
                        }
                      }}
                    >
                      Check-in
                    </Btn>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Penanganan Check-In Saat Bilik Sedang Terpakai */}
      {checkInModalBooking && (
        <CheckInConflictModal
          booking={checkInModalBooking}
          units={units}
          onClose={() => setCheckInModalBooking(null)}
          onCheckInUnit={(targetUnitId) => {
            onCheckIn(checkInModalBooking.id, targetUnitId);
            setCheckInModalBooking(null);
          }}
          onSwitchActiveUnit={(unitId) => {
            const unit = units.find((u) => u.id === unitId);
            setCheckInModalBooking(null);
            if (unit && onSwitchUnit) onSwitchUnit(unit);
          }}
        />
      )}
    </div>
  );
}

function CheckInConflictModal({ booking, units, onClose, onCheckInUnit, onSwitchActiveUnit }) {
  const idleUnits = units.filter((u) => u.status !== "active");
  const [selectedTargetUnit, setSelectedTargetUnit] = useState(idleUnits[0]?.id || "");

  return (
    <Modal title="Bilik Sedang Terpakai" onClose={onClose} width="max-w-md">
      <div
        style={{ background: C.warningSoft, border: `1px solid ${C.warningBorder}`, color: C.warning }}
        className="p-3 mb-4 rounded-lg text-xs leading-relaxed"
      >
        <p className="font-semibold text-[13px] mb-1" style={{ color: C.text }}>
          {booking.unit_name} sedang dipakai
        </p>
        Solusi check-in reservasi <b>{booking.customer_name}</b> (jam {booking.booking_time}):
      </div>

      {idleUnits.length > 0 ? (
        <div className="space-y-3 mb-4">
          <div style={{ background: C.surface2, border: `1px solid ${C.border}` }} className="p-3 rounded-lg">
            <label className="block text-xs font-medium mb-2" style={{ color: C.textDim }}>
              Check-in ke bilik lain
            </label>
            <div className="flex gap-2">
              <select
                style={inputStyle}
                className="flex-1 rounded-lg px-2.5 py-2 text-xs outline-none"
                value={selectedTargetUnit}
                onChange={(e) => setSelectedTargetUnit(Number(e.target.value))}
              >
                {idleUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.type}) &mdash; Rp {u.rate.toLocaleString("id-ID")}/jam
                  </option>
                ))}
              </select>
              <Btn
                icon={CheckCircle2}
                onClick={() => onCheckInUnit(selectedTargetUnit)}
                disabled={!selectedTargetUnit}
                className="!py-1.5 !px-3 !text-xs"
              >
                Pilih
              </Btn>
            </div>
          </div>

          <div style={{ background: C.surface2, border: `1px solid ${C.border}` }} className="p-3 rounded-lg">
            <label className="block text-xs font-medium mb-1" style={{ color: C.textDim }}>
              Pindah pemain di {booking.unit_name}
            </label>
            <p className="text-[11px] mb-2.5" style={{ color: C.textFaint }}>
              Pindahkan sesi aktif di {booking.unit_name} ke bilik lain.
            </p>
            <Btn
              variant="secondary"
              icon={ArrowRightLeft}
              className="w-full !text-xs"
              onClick={() => onSwitchActiveUnit(booking.unit_id)}
            >
              Pindah Sesi Aktif
            </Btn>
          </div>
        </div>
      ) : (
        <div
          style={{ background: C.dangerSoft, border: `1px solid ${C.dangerBorder}`, color: C.danger }}
          className="text-xs p-3 rounded-lg mb-4"
        >
          Semua bilik saat ini sedang penuh. Harap tunggu hingga salah satu bilik selesai.
        </div>
      )}

      <Btn variant="ghost" className="w-full" onClick={onClose}>
        Batal
      </Btn>
    </Modal>
  );
}

export function AddBookingModal({ units, onClose, onSave }) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    customerName: "",
    unitId: units[0]?.id || "",
    date: today,
    time: "14:00",
    durationHours: 1,
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorInfo, setErrorInfo] = useState(null);

  const set = (k, v) => {
    setErrorInfo(null);
    setForm((f) => ({ ...f, [k]: v }));
  };

  const submit = async () => {
    setSubmitting(true);
    setErrorInfo(null);
    try {
      await onSave(form);
    } catch (err) {
      setErrorInfo({
        message: err.message || "Gagal membuat booking.",
        availableUnits: err.availableUnits || [],
      });
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Booking Baru" onClose={onClose} width="max-w-md">
      {errorInfo && (
        <div
          style={{ background: C.dangerSoft, border: `1px solid ${C.dangerBorder}`, color: C.danger }}
          className="p-3 mb-4 rounded-lg text-xs leading-relaxed"
        >
          <p className="font-semibold mb-1">{errorInfo.message}</p>
          {errorInfo.availableUnits && errorInfo.availableUnits.length > 0 && (
            <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${C.dangerBorder}` }}>
              <span className="font-medium block mb-1.5">Pilih bilik alternatif:</span>
              <div className="flex flex-wrap gap-1.5">
                {errorInfo.availableUnits.map((alt) => (
                  <button
                    key={alt.id}
                    type="button"
                    onClick={() => set("unitId", alt.id)}
                    style={{ background: C.successSoft, border: `1px solid ${C.successBorder}`, color: C.success }}
                    className="px-2.5 py-1 rounded-md font-semibold transition-colors hover:brightness-95 text-xs"
                  >
                    Pilih {alt.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Field label="Nama Pelanggan">
        <input
          style={inputStyle}
          className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
          value={form.customerName}
          onChange={(e) => set("customerName", e.target.value)}
          placeholder="Nama pelanggan"
        />
      </Field>

      <Field label="Pilih Bilik / Unit">
        <select
          style={inputStyle}
          className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
          value={form.unitId}
          onChange={(e) => set("unitId", Number(e.target.value))}
        >
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.type}) &mdash; {u.status === "active" ? "Terpakai" : "Kosong"}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Tanggal">
          <input
            type="date"
            style={inputStyle}
            className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
          />
        </Field>
        <Field label="Jam Mulai">
          <input
            type="time"
            style={inputStyle}
            className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
            value={form.time}
            onChange={(e) => set("time", e.target.value)}
          />
        </Field>
      </div>

      <Field label="Durasi (Jam)">
        <input
          type="number"
          min={1}
          max={12}
          style={inputStyle}
          className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
          value={form.durationHours}
          onChange={(e) => set("durationHours", Number(e.target.value))}
        />
      </Field>

      <Btn
        className="w-full mt-2 !py-2.5"
        icon={Calendar}
        disabled={!form.customerName || !form.date || !form.time || submitting}
        onClick={submit}
      >
        {submitting ? "Memeriksa..." : "Simpan Booking"}
      </Btn>
    </Modal>
  );
}
