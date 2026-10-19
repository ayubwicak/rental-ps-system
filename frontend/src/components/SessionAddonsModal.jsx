import React, { useState } from "react";
import { Plus, Minus, Check, ShoppingBag } from "lucide-react";
import { Modal, Btn } from "./ui.jsx";
import { C } from "../styles/tokens.js";
import { fmtIDR } from "../utils/format.js";

export default function SessionAddonsModal({ unit, addons, onClose, onConfirm }) {
  const currentAddons = unit?.session?.addons || [];

  // Inisialisasi state qty untuk setiap addon berdasarkan pesanan yang sudah ada
  const [selectedQty, setSelectedQty] = useState(() => {
    const initial = {};
    for (const a of currentAddons) {
      initial[a.id] = a.qty;
    }
    return initial;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateQty = (id, delta) => {
    setSelectedQty((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [id]: next };
    });
  };

  const handleSave = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = Object.entries(selectedQty).map(([id, qty]) => ({
        id: Number(id),
        qty: Number(qty),
      }));
      await onConfirm(payload);
    } catch (err) {
      setError(err.message || "Gagal menyimpan pesanan kantin.");
      setLoading(false);
    }
  };

  const totalCost = addons.reduce((sum, item) => {
    const qty = selectedQty[item.id] || 0;
    return sum + item.price * qty;
  }, 0);

  const totalItemCount = Object.values(selectedQty).reduce((sum, q) => sum + q, 0);

  return (
    <Modal title={`Pesan Kantin — ${unit.name}`} onClose={onClose} width="max-w-md">
      <div
        style={{ background: C.primarySoft, border: `1px solid ${C.primaryBorder}` }}
        className="text-xs mb-4 p-2.5 rounded-lg flex items-center justify-between gap-2"
      >
        <span style={{ color: C.textDim }} className="truncate">
          Pelanggan: <b style={{ color: C.text }}>{unit.session?.customer_name}</b>
        </span>
        <span className="flex items-center gap-1 font-medium shrink-0" style={{ color: C.primaryDark }}>
          <ShoppingBag size={13} /> {totalItemCount} item
        </span>
      </div>

      {error && (
        <div
          style={{ background: C.dangerSoft, border: `1px solid ${C.dangerBorder}`, color: C.danger }}
          className="p-3 mb-4 rounded-lg text-xs font-medium"
        >
          {error}
        </div>
      )}

      <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1 mb-4">
        {addons.length === 0 ? (
          <div className="text-center py-6 text-xs" style={{ color: C.textFaint }}>
            Belum ada menu kantin/add-on yang terdaftar.
          </div>
        ) : (
          addons.map((item) => {
            const qty = selectedQty[item.id] || 0;
            const itemTotal = item.price * qty;
            const isOutOfStock = item.stock <= 0 && qty === 0;

            return (
              <div
                key={item.id}
                className="p-3 rounded-lg border flex items-center justify-between transition-colors"
                style={{
                  background: qty > 0 ? C.primarySoft : C.surface,
                  borderColor: qty > 0 ? C.primaryBorder : C.border,
                }}
              >
                <div className="min-w-0 pr-2">
                  <div className="font-medium text-sm truncate" style={{ color: C.text }}>{item.name}</div>
                  <div className="text-xs flex items-center gap-2 mt-0.5 tabular" style={{ color: C.textDim }}>
                    <span>{fmtIDR(item.price)}</span>
                    <span>&middot;</span>
                    <span style={item.stock > 0 ? { color: C.success } : { color: C.danger }}>
                      Stok: {item.stock}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {qty > 0 && (
                    <span className="text-xs font-semibold tabular" style={{ color: C.success }}>
                      {fmtIDR(itemTotal)}
                    </span>
                  )}
                  <div
                    style={{ background: C.surface2, border: `1px solid ${C.border}` }}
                    className="flex items-center gap-1.5 p-1 rounded-lg"
                  >
                    <button
                      type="button"
                      disabled={qty <= 0}
                      onClick={() => updateQty(item.id, -1)}
                      style={{ color: C.textDim }}
                      className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-[var(--c-inset)] disabled:opacity-30 transition-colors"
                      aria-label={`Kurangi ${item.name}`}
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-6 text-center tabular text-sm font-semibold" style={{ color: C.text }}>
                      {qty}
                    </span>
                    <button
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => updateQty(item.id, 1)}
                      style={{ background: C.fillPrimary, color: "#fff" }}
                      className="w-6 h-6 rounded-md flex items-center justify-center disabled:opacity-30 transition-opacity"
                      aria-label={`Tambah ${item.name}`}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div
        style={{ borderTop: `1px solid ${C.border}` }}
        className="pt-3 flex items-center justify-between mb-4"
      >
        <span className="text-xs" style={{ color: C.textDim }}>Total tambahan:</span>
        <span className="font-semibold text-base tabular" style={{ color: C.success }}>
          {fmtIDR(totalCost)}
        </span>
      </div>

      <div className="flex gap-2">
        <Btn variant="ghost" onClick={onClose} className="flex-1 !py-2.5">
          Batal
        </Btn>
        <Btn
          icon={Check}
          onClick={handleSave}
          disabled={loading}
          className="flex-1 !py-2.5"
        >
          {loading ? "Menyimpan..." : "Simpan Pesanan"}
        </Btn>
      </div>
    </Modal>
  );
}
