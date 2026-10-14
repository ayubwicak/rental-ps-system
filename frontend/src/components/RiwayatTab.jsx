import React, { useState } from "react";
import { Search } from "lucide-react";
import { C, inputStyle } from "../styles/tokens.js";
import { Card, EmptyState } from "./ui.jsx";
import { fmtIDR, fmtClock, fmtDateTimeWIB } from "../utils/format.js";

export default function RiwayatTab({ transactions }) {
  const [q, setQ] = useState("");
  const filtered = transactions.filter((t) =>
    t.customer_name.toLowerCase().includes(q.toLowerCase()) ||
    t.unit_name.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div>
      <header className="mb-5">
        <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold truncate">Riwayat Transaksi</h1>
        <p style={{ color: C.textDim }} className="text-xs sm:text-sm mt-0.5 sm:mt-1">Semua sesi selesai dibayar.</p>
      </header>

      <div className="relative mb-4 max-w-sm">
        <Search size={16} style={{ color: C.textDim }} className="absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          style={inputStyle}
          className="w-full rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none"
          placeholder="Cari pelanggan atau unit..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState text="Belum ada transaksi. Riwayat akan muncul setelah sesi pertama selesai." />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((t) => (
            <Card key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="font-semibold">{t.customer_name} &middot; {t.unit_name}</div>
                <div style={{ color: C.textDim }} className="text-xs mt-0.5">
                  {fmtDateTimeWIB(t.created_at)} &middot; {fmtClock(t.duration_sec)} &middot; {t.payment_method.toUpperCase()}
                  {t.discount_amount > 0 && <span className="text-red-400 font-semibold ml-1.5">(Diskon: -{fmtIDR(t.discount_amount)})</span>}
                </div>
              </div>
              <div className="font-mono font-bold" style={{ color: C.mint }}>{fmtIDR(t.total)}</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
