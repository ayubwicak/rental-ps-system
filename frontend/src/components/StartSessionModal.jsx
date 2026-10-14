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
            className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
              durationMode === "open"
                ? "border-violet-500 bg-violet-500/20 text-white"
                : "border-gray-700 bg-gray-800/40 text-gray-400"
            }`}
          >
            <Zap size={14} /> Open Billing
          </button>
          <button
            type="button"
            onClick={() => setDurationMode("package")}
            className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
              durationMode === "package"
                ? "border-violet-500 bg-violet-500/20 text-white"
                : "border-gray-700 bg-gray-800/40 text-gray-400"
            }`}
          >
            <Clock size={14} /> Paket Waktu
          </button>
        </div>

        {durationMode === "package" && (
          <div className="p-3 rounded-lg border border-violet-500/30 bg-violet-500/10 mb-3">
            <div className="text-xs font-medium mb-2 text-violet-300">Pilih Durasi Paket:</div>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {packagePresets.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setPackageHours(h)}
                  className={`py-1.5 rounded text-xs font-bold ${
                    packageHours === h
                      ? "bg-violet-600 text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {h} Jam
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-400">Custom (Jam):</span>
              <input
                type="number"
                min="0.5"
                step="0.5"
                style={inputStyle}
                className="w-20 rounded px-2 py-1 text-xs text-center outline-none"
                value={packageHours}
                onChange={(e) => setPackageHours(Math.max(0.5, parseFloat(e.target.value) || 1))}
              />
              <span className="text-xs text-gray-400">
                Total: <b className="text-emerald-400">{fmtIDR(packageHours * unit.rate)}</b>
              </span>
            </div>
          </div>
        )}
      </Field>

      <Field label="Snack & Minuman (Opsional)">
        <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
          {addons.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between p-2 rounded-lg"
              style={{ background: C.surface2 }}
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <Coffee size={14} color={C.textDim} />
                  <span>{a.name}</span>
                </div>
                <div style={{ color: C.textDim }} className="text-xs flex gap-2">
                  <span>{fmtIDR(a.price)}</span>
                  <span className={a.stock < 5 ? "text-amber-400 font-semibold" : ""}>
                    Stok: {a.stock ?? 100}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQty(a.id, -1, a.stock)}
                  className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: C.border }}
                >
                  <Minus size={12} />
                </button>
                <span className="w-4 text-center text-sm font-semibold">{qtys[a.id] || 0}</span>
                <button
                  type="button"
                  onClick={() => setQty(a.id, 1, a.stock)}
                  className="w-6 h-6 rounded-full flex items-center justify-center disabled:opacity-30"
                  style={{ background: C.violet }}
                  disabled={a.stock !== undefined && (qtys[a.id] || 0) >= a.stock}
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Field>

      <Btn className="w-full mt-2" icon={Play} onClick={submit} disabled={submitting}>
        {submitting ? "Memulai..." : "Mulai Sesi"}
      </Btn>
    </Modal>
  );
}
