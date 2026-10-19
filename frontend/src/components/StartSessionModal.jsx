import React, { useState } from "react";
import { Coffee, Minus, Plus, Play, Clock, Zap } from "lucide-react";
import { C, inputStyle } from "../styles/tokens.js";
import { Modal, Field, Btn } from "./ui.jsx";
import { fmtIDR } from "../utils/format.js";

export default function StartSessionModal({ unit, members, addons, onClose, onConfirm }) {
  const [customer, setCustomer] = useState("");
  const [memberId, setMemberId] = useState("");
  const [durationMode, setDurationMode] = useState("open"); // "open" | "package"
  const [packageHours, setPackageHours] = useState(1);
  const [qtys, setQtys] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const setQty = (id, delta, maxStock) => {
    setQtys((q) => {
      const current = q[id] || 0;
      const next = Math.max(0, current + delta);
      if (maxStock !== undefined && next > maxStock) return q;
      return { ...q, [id]: next };
    });
  };

  const selectedAddons = addons
    .filter((a) => qtys[a.id] > 0)
    .map((a) => ({ id: a.id, qty: qtys[a.id] }));

  const submit = async () => {
    setSubmitting(true);
    try {
      await onConfirm({
        customerName: customer.trim() || "Umum",
        memberId: memberId || null,
        durationMode,
        packageHours: durationMode === "package" ? Number(packageHours) : 0,
        addons: selectedAddons,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const packagePresets = [1, 2, 3, 5];

  const modeBtnStyle = (isActive) => ({
    background: isActive ? C.primarySoft : C.surface,
    border: `1px solid ${isActive ? C.primary : C.borderStrong}`,
    color: isActive ? C.primaryDark : C.textDim,
  });

  return (
    <Modal title={`Mulai Sewa — ${unit.name}`} onClose={onClose}>
      <Field label="Nama Pelanggan">
        <input
          style={inputStyle}
          className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
          placeholder="Contoh: Budi"
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
        />
      </Field>

      {members.length > 0 && (
        <Field label="Sebagai Member (opsional)">
          <select
            style={inputStyle}
            className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
          >
            <option value="">— Bukan member —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.points} poin)
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Mode Sewa">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            type="button"
            onClick={() => setDurationMode("open")}
            style={modeBtnStyle(durationMode === "open")}
            className="flex items-center justify-center gap-2 p-2.5 rounded-lg text-xs font-medium transition-colors"
          >
            <Zap size={14} /> Open Billing
          </button>
          <button
            type="button"
            onClick={() => setDurationMode("package")}
            style={modeBtnStyle(durationMode === "package")}
            className="flex items-center justify-center gap-2 p-2.5 rounded-lg text-xs font-medium transition-colors"
          >
            <Clock size={14} /> Paket Waktu
          </button>
        </div>

        {durationMode === "package" && (
          <div
            style={{ background: C.primarySoft, border: `1px solid ${C.primaryBorder}` }}
            className="p-3 rounded-lg mb-3"
          >
            <div className="text-xs font-medium mb-2" style={{ color: C.primaryDark }}>
              Pilih durasi paket:
            </div>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {packagePresets.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setPackageHours(h)}
                  style={
                    packageHours === h
                      ? { background: C.fillPrimary, color: "#fff", border: `1px solid ${C.fillPrimary}` }
                      : { background: C.surface, color: C.textDim, border: `1px solid ${C.borderStrong}` }
                  }
                  className="py-1.5 rounded-md text-xs font-semibold transition-colors"
                >
                  {h} Jam
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs" style={{ color: C.textDim }}>Custom (jam):</span>
              <input
                type="number"
                min="0.5"
                step="0.5"
                style={inputStyle}
                className="w-20 rounded-md px-2 py-1 text-xs text-center outline-none tabular"
                value={packageHours}
                onChange={(e) => setPackageHours(Math.max(0.5, parseFloat(e.target.value) || 1))}
              />
              <span className="text-xs" style={{ color: C.textDim }}>
                Total: <b style={{ color: C.success }} className="tabular">{fmtIDR(packageHours * unit.rate)}</b>
              </span>
            </div>
          </div>
        )}
      </Field>

      <Field label="Snack & Minuman (Opsional)">
        <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
          {addons.length === 0 && (
            <div className="text-xs text-center py-4" style={{ color: C.textFaint }}>
              Belum ada menu kantin terdaftar.
            </div>
          )}
          {addons.map((a) => (
            <div
              key={a.id}
              style={{ background: C.surface2, border: `1px solid ${C.border}` }}
              className="flex items-center justify-between p-2 rounded-lg"
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: C.text }}>
                  <Coffee size={14} style={{ color: C.textFaint }} />
                  <span>{a.name}</span>
                </div>
                <div style={{ color: C.textDim }} className="text-xs flex gap-2 tabular">
                  <span>{fmtIDR(a.price)}</span>
                  <span style={a.stock < 5 ? { color: C.warning, fontWeight: 600 } : {}}>
                    Stok: {a.stock ?? 100}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQty(a.id, -1, a.stock)}
                  style={{ background: C.surface, border: `1px solid ${C.borderStrong}`, color: C.textDim }}
                  className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-[var(--c-inset)] transition-colors"
                  aria-label={`Kurangi ${a.name}`}
                >
                  <Minus size={12} />
                </button>
                <span className="w-4 text-center text-sm font-semibold tabular" style={{ color: C.text }}>
                  {qtys[a.id] || 0}
                </span>
                <button
                  type="button"
                  onClick={() => setQty(a.id, 1, a.stock)}
                  style={{ background: C.fillPrimary, color: "#fff" }}
                  className="w-6 h-6 rounded-md flex items-center justify-center disabled:opacity-30 transition-opacity"
                  disabled={a.stock !== undefined && (qtys[a.id] || 0) >= a.stock}
                  aria-label={`Tambah ${a.name}`}
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Field>

      <Btn className="w-full mt-2 !py-2.5" icon={Play} onClick={submit} disabled={submitting}>
        {submitting ? "Memulai..." : "Mulai Sesi"}
      </Btn>
    </Modal>
  );
}
