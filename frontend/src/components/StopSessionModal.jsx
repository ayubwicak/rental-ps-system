import React, { useState } from "react";
import { Wallet, QrCode, Landmark, CheckCircle2, Tag, Award } from "lucide-react";
import { C, inputStyle } from "../styles/tokens.js";
import { Modal, Field, Btn } from "./ui.jsx";
import { fmtIDR, fmtClock } from "../utils/format.js";

const METHODS = [
  { id: "cash", label: "Cash", icon: Wallet },
  { id: "qris", label: "QRIS", icon: QrCode },
  { id: "transfer", label: "Transfer", icon: Landmark },
];

export default function StopSessionModal({ unit, now, members = [], onClose, onConfirm }) {
  const [method, setMethod] = useState("cash");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountReason, setDiscountReason] = useState("");
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const session = unit.session;
  if (!session) return null;

  const member = members.find((m) => m.id === session.member_id);

  const startMs = new Date(session.start_time + "Z").getTime();
  let pausedSec = session.total_paused_sec || 0;
  if (session.status === "paused" && session.paused_at) {
    pausedSec += Math.floor((now - new Date(session.paused_at + "Z").getTime()) / 1000);
  }

  const rawDurationSec = Math.max(1, Math.floor((now - startMs) / 1000));
  const activeDurationSec = Math.max(1, rawDurationSec - pausedSec);

  let rentalCost = 0;
  if (session.duration_mode === "package" && session.package_hours > 0) {
    rentalCost = session.package_hours * unit.rate;
  } else {
    rentalCost = (activeDurationSec / 3600) * unit.rate;
  }

  const addonsCost = (session.addons || []).reduce((s, a) => s + a.price * a.qty, 0);

  const pointDiscount = Number(redeemPoints) * 200; // 1 Poin = Rp 200
  const totalDiscount = Math.min(rentalCost + addonsCost, Number(discountAmount) + pointDiscount);
  const grandTotal = Math.max(0, rentalCost + addonsCost - totalDiscount);

  const submit = async () => {
    setSubmitting(true);
    try {
      await onConfirm({
        paymentMethod: method,
        discountAmount: Number(discountAmount),
        discountReason,
        redeemPoints: Number(redeemPoints),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={`Selesai — ${unit.name}`} onClose={onClose}>
      <div style={{ background: C.surface2, border: `1px solid ${C.border}` }} className="rounded-lg p-4 mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span style={{ color: C.textDim }}>Pelanggan</span>
          <span className="font-medium" style={{ color: C.text }}>{session.customer_name}</span>
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span style={{ color: C.textDim }}>Mode Sewa</span>
          <span className="font-medium" style={{ color: C.primaryDark }}>
            {session.duration_mode === "package"
              ? `Paket ${session.package_hours} Jam`
              : "Open Billing"}
          </span>
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span style={{ color: C.textDim }}>Durasi Berjalan</span>
          <span className="tabular font-mono font-medium" style={{ color: C.text }}>{fmtClock(activeDurationSec)}</span>
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span style={{ color: C.textDim }}>Biaya Sewa</span>
          <span className="tabular" style={{ color: C.text }}>{fmtIDR(rentalCost)}</span>
        </div>
        {addonsCost > 0 && (
          <div className="flex justify-between text-sm mb-2">
            <span style={{ color: C.textDim }}>Biaya Tambahan</span>
            <span className="tabular" style={{ color: C.text }}>{fmtIDR(addonsCost)}</span>
          </div>
        )}

        {totalDiscount > 0 && (
          <div className="flex justify-between text-sm mb-2 font-medium" style={{ color: C.danger }}>
            <span>Total Potongan</span>
            <span className="tabular">-{fmtIDR(totalDiscount)}</span>
          </div>
        )}

        <div
          style={{ borderTop: `1px solid ${C.borderStrong}` }}
          className="flex justify-between text-base font-semibold pt-2.5 mt-2.5"
        >
          <span style={{ color: C.text }}>TOTAL BAYAR</span>
          <span className="tabular" style={{ color: C.success }}>{fmtIDR(grandTotal)}</span>
        </div>
      </div>

      {member && member.points > 0 && (
        <div
          style={{ background: C.warningSoft, border: `1px solid ${C.warningBorder}` }}
          className="p-3 rounded-lg mb-4"
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: C.warning }}>
            <Award size={14} /> Tukar Poin Member ({member.points} poin tersedia)
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: C.textDim }}>Tukar poin:</span>
            <input
              type="number"
              min="0"
              max={member.points}
              style={inputStyle}
              className="w-20 rounded-md px-2 py-1 text-xs text-center outline-none tabular"
              value={redeemPoints}
              onChange={(e) =>
                setRedeemPoints(Math.min(member.points, Math.max(0, parseInt(e.target.value) || 0)))
              }
            />
            <span className="text-xs font-medium tabular" style={{ color: C.success }}>
              (Hemat {fmtIDR(redeemPoints * 200)})
            </span>
          </div>
        </div>
      )}

      <Field label="Diskon / Voucher (Opsional)">
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <Tag size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: C.textFaint }} />
            <input
              type="number"
              min="0"
              style={inputStyle}
              className="w-full rounded-lg pl-8 pr-2 py-2 text-xs outline-none tabular"
              placeholder="Potongan (Rp)"
              value={discountAmount || ""}
              onChange={(e) => setDiscountAmount(Math.max(0, parseInt(e.target.value) || 0))}
            />
          </div>
          <input
            style={inputStyle}
            className="w-full rounded-lg px-2.5 py-2 text-xs outline-none"
            placeholder="Alasan (mis. promo)"
            value={discountReason}
            onChange={(e) => setDiscountReason(e.target.value)}
          />
        </div>
      </Field>

      <Field label="Metode Pembayaran">
        <div className="grid grid-cols-3 gap-2">
          {METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethod(m.id)}
              style={{
                background: method === m.id ? C.primarySoft : C.surface,
                border: `1px solid ${method === m.id ? C.primary : C.borderStrong}`,
                color: method === m.id ? C.primaryDark : C.textDim,
              }}
              className="rounded-lg py-3 flex flex-col items-center gap-1 text-xs font-medium transition-colors"
            >
              <m.icon size={16} />
              {m.label}
            </button>
          ))}
        </div>
      </Field>

      <Btn className="w-full mt-2 !py-2.5" icon={CheckCircle2} onClick={submit} disabled={submitting}>
        {submitting ? "Memproses..." : "Bayar Sekarang"}
      </Btn>
    </Modal>
  );
}
