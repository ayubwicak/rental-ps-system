import React, { useState } from "react";
import { Coffee, Plus, Minus, Check, ShoppingBag } from "lucide-react";
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
    <Modal title={`Pesan Food & Drink — ${unit.name}`} onClose={onClose} width="max-w-md">
      <div className="text-xs mb-4 p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 flex items-center justify-between">
        <span>Pelanggan: <b className="text-white">{unit.session?.customer_name}</b></span>
        <span className="flex items-center gap-1 font-semibold">
          <ShoppingBag size={14} /> {totalItemCount} Item Dipesan
        </span>
      </div>

      {error && (
        <div className="p-3 mb-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-semibold">
          {error}
        </div>
      )}

      <div className="space-y-3 max-h-80 overflow-y-auto pr-1 mb-4">
        {addons.length === 0 ? (
          <div className="text-center py-6 text-xs text-gray-500">
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
                className="p-3 rounded-xl border flex items-center justify-between transition-colors"
                style={{
                  background: qty > 0 ? "rgba(139,107,255,0.08)" : C.surface,
                  borderColor: qty > 0 ? "rgba(139,107,255,0.3)" : C.border,
                }}
              >
                <div className="min-w-0 pr-2">
                  <div className="font-semibold text-sm truncate">{item.name}</div>
                  <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                    <span>{fmtIDR(item.price)}</span>
                    <span>&middot;</span>
                    <span className={item.stock > 0 ? "text-emerald-400" : "text-red-400"}>
                      Stok: {item.stock}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {qty > 0 && (
                    <span className="text-xs font-bold text-emerald-400 mr-1">
                      {fmtIDR(itemTotal)}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 bg-gray-900/80 p-1 rounded-lg border border-gray-800">
                    <button
                      type="button"
                      disabled={qty <= 0}
                      onClick={() => updateQty(item.id, -1)}
                      className="w-6 h-6 rounded flex items-center justify-center text-gray-300 hover:bg-gray-800 disabled:opacity-30"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-6 text-center font-mono text-sm font-bold">
                      {qty}
                    </span>
                    <button
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => updateQty(item.id, 1)}
                      className="w-6 h-6 rounded flex items-center justify-center text-violet-300 hover:bg-violet-600/30 disabled:opacity-30"
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

      <div className="pt-3 border-t border-gray-800/80 flex items-center justify-between mb-4">
        <span className="text-xs text-gray-400">Total Tambahan:</span>
        <span className="font-display font-extrabold text-base text-emerald-400">
          {fmtIDR(totalCost)}
        </span>
      </div>

      <div className="flex gap-2">
        <Btn variant="ghost" onClick={onClose} className="flex-1">
          Batal
        </Btn>
        <Btn
          icon={Check}
          onClick={handleSave}
          disabled={loading}
          className="flex-1"
        >
          {loading ? "Menyimpan..." : "Simpan Pesanan"}
        </Btn>
      </div>
    </Modal>
  );
}
