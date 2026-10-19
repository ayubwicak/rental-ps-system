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
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">Riwayat Transaksi</h1>
        <p style={{ color: C.textDim }} className="text-[13px] mt-1">
          {transactions.length > 0 ? `${transactions.length} transaksi selesai dibayar.` : "Semua sesi selesai dibayar."}
        </p>
      </header>

      <div className="relative mb-4 max-w-sm">
        <Search size={16} style={{ color: C.textFaint }} className="absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          style={inputStyle}
          className="w-full rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none"
          placeholder="Cari pelanggan atau unit..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          text={
            q
              ? `Tidak ada transaksi yang cocok dengan pencarian "${q}".`
              : "Belum ada transaksi. Riwayat akan muncul setelah sesi pertama selesai."
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((t) => (
            <Card key={t.id} className="!p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium text-sm" style={{ color: C.text }}>
                  {t.customer_name} <span style={{ color: C.textFaint }}>&middot;</span> {t.unit_name}
                </div>
                <div style={{ color: C.textDim }} className="text-xs mt-1 tabular">
                  {fmtDateTimeWIB(t.created_at)} &middot; {fmtClock(t.duration_sec)} &middot; {t.payment_method.toUpperCase()}
                  {t.discount_amount > 0 && (
                    <span className="font-medium ml-1.5" style={{ color: C.danger }}>
                      (Diskon -{fmtIDR(t.discount_amount)})
                    </span>
                  )}
                </div>
              </div>
              <div className="tabular font-mono font-semibold text-sm shrink-0" style={{ color: C.success }}>
                {fmtIDR(t.total)}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
