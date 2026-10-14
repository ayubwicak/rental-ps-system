import React, { useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { C, inputStyle } from "../styles/tokens.js";
import { Modal, Field, Btn } from "./ui.jsx";

export default function SwitchUnitModal({ sourceUnit, availableUnits, onClose, onConfirm }) {
  const [targetUnitId, setTargetUnitId] = useState("");
  const [loading, setLoading] = useState(false);

  const idleUnits = availableUnits.filter((u) => u.id !== sourceUnit.id && u.status !== "active");

  const submit = async () => {
    if (!targetUnitId) return;
    setLoading(true);
    try {
      await onConfirm(sourceUnit.id, targetUnitId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`Pindah Unit — ${sourceUnit.name}`} onClose={onClose}>
      <div className="mb-4 text-xs" style={{ color: C.textDim }}>
        Sesi bermain pelanggan <b className="text-white">{sourceUnit.session?.customer_name}</b> akan dipindahkan ke unit kosong lain. Waktu bermain tetap berlanjut tanpa terreset.
      </div>

      <Field label="Pilih Unit Tujuan">
        {idleUnits.length > 0 ? (
          <select
            style={inputStyle}
            className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
            value={targetUnitId}
            onChange={(e) => setTargetUnitId(e.target.value)}
          >
            <option value="">-- Pilih Unit Kosong --</option>
            {idleUnits.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.type}) &middot; Rp {u.rate.toLocaleString("id-ID")}/jam
              </option>
            ))}
          </select>
        ) : (
          <div className="p-3 text-center text-xs rounded-lg" style={{ background: C.surface2, color: C.coral }}>
            Tidak ada unit lain yang sedang kosong saat ini.
          </div>
        )}
      </Field>

      <Btn
        className="w-full mt-2"
        icon={ArrowRightLeft}
        onClick={submit}
        disabled={!targetUnitId || loading}
      >
        {loading ? "Memindahkan..." : "Pindah Unit"}
      </Btn>
    </Modal>
  );
}
