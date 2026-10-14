import React, { useState } from "react";
import { Plus, Trophy, Users } from "lucide-react";
import { C, inputStyle } from "../styles/tokens.js";
import { Card, Btn, Modal, Field, EmptyState } from "./ui.jsx";

export default function MemberTab({ members, onAdd }) {
  return (
    <div>
      <header className="mb-5 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold truncate">Member</h1>
          <p style={{ color: C.textDim }} className="text-xs sm:text-sm mt-0.5 sm:mt-1 truncate sm:whitespace-normal">
            Pelanggan tetap &amp; poin loyalti.
          </p>
        </div>
        <Btn icon={Plus} onClick={onAdd} className="shrink-0">
          Tambah Member
        </Btn>
      </header>

      {members.length === 0 ? (
        <EmptyState text="Belum ada member terdaftar. Daftarkan pelanggan tetap untuk mulai kumpulkan poin." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {members.map((m) => (
            <Card key={m.id}>
              <div className="flex items-center gap-3 mb-3">
                <div style={{ background: C.violetDim }} className="w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0">
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm sm:text-base truncate">{m.name}</div>
                  <div style={{ color: C.textDim }} className="text-xs truncate">{m.phone || "-"}</div>
                </div>
              </div>
              <div className="flex items-center gap-2" style={{ color: C.gold }}>
                <Trophy size={14} />
                <span className="text-xs sm:text-sm font-bold">{m.points} poin</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function AddMemberModal({ onClose, onSave }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await onSave({ name, phone });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Tambah Member" onClose={onClose}>
      <Field label="Nama">
        <input style={inputStyle} className="w-full rounded-lg px-3 py-2.5 text-sm outline-none" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama lengkap" />
      </Field>
      <Field label="No. HP">
        <input style={inputStyle} className="w-full rounded-lg px-3 py-2.5 text-sm outline-none" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
      </Field>
      <Btn className="w-full mt-2" icon={Users} disabled={!name || submitting} onClick={submit}>
        {submitting ? "Menyimpan..." : "Simpan Member"}
      </Btn>
    </Modal>
  );
}
