import React, { useState } from "react";
import { Coffee, Plus, Trash2, Edit2, AlertTriangle, PackageCheck } from "lucide-react";
import { C, inputStyle } from "../styles/tokens.js";
import { Card, Btn, Field, Modal, EmptyState } from "./ui.jsx";
import { fmtIDR } from "../utils/format.js";

export default function KantinTab({ addons = [], onRefresh, isAdmin = false }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [loading, setLoading] = useState(false);

  const openAdd = () => {
    setEditingItem(null);
    setName("");
    setPrice("");
    setStock("100");
    setShowAddModal(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setName(item.name);
    setPrice(item.price.toString());
    setStock(item.stock?.toString() || "100");
    setShowAddModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim() || !price) return;
    setLoading(true);
    try {
      await onRefresh({
        id: editingItem ? editingItem.id : undefined,
        name: name.trim(),
        price: Number(price),
        stock: Number(stock),
      });
      setShowAddModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Yakin ingin menghapus produk ini?")) return;
    await onRefresh({ deleteId: id });
  };

  return (
    <div>
      <header className="flex items-center justify-between gap-3 mb-5">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">
            Stok &amp; Kantin
          </h1>
          <p style={{ color: C.textDim }} className="text-[13px] mt-1">
            Kelola snack &amp; minuman rental.
          </p>
        </div>
        <Btn icon={Plus} onClick={openAdd} className="shrink-0">
          Tambah Produk
        </Btn>
      </header>

      {addons.length === 0 ? (
        <EmptyState text="Belum ada produk kantin. Tambahkan snack atau minuman untuk mulai berjualan." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {addons.map((a) => {
            const isLowStock = (a.stock ?? 100) < 10;
            return (
              <Card key={a.id} className="flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: C.primarySoft, color: C.primary }}
                    >
                      <Coffee size={17} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate" style={{ color: C.text }}>{a.name}</div>
                      <div className="text-xs font-medium tabular" style={{ color: C.success }}>{fmtIDR(a.price)}</div>
                    </div>
                  </div>

                  <div
                    style={{ background: C.surface2, border: `1px solid ${C.border}` }}
                    className="p-2 rounded-lg flex items-center justify-between text-xs"
                  >
                    <span style={{ color: C.textDim }}>Sisa stok</span>
                    <span className="tabular font-semibold" style={{ color: isLowStock ? C.warning : C.text }}>
                      {a.stock ?? 100} unit
                    </span>
                  </div>

                  {isLowStock && (
                    <div className="mt-2 text-[11px] font-medium flex items-center gap-1" style={{ color: C.warning }}>
                      <AlertTriangle size={12} /> Stok menipis, isi ulang
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: `1px solid ${C.inset}` }}>
                  <Btn
                    variant="secondary"
                    icon={Edit2}
                    onClick={() => openEdit(a)}
                    className="flex-1 !text-xs"
                  >
                    Edit
                  </Btn>
                  {isAdmin && (
                    <Btn
                      variant="dangerGhost"
                      icon={Trash2}
                      onClick={() => handleDelete(a.id)}
                      title="Hapus produk"
                      aria-label="Hapus produk"
                      className="!px-2.5"
                    />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showAddModal && (
        <Modal
          title={editingItem ? "Edit Produk" : "Tambah Produk"}
          onClose={() => setShowAddModal(false)}
        >
          <form onSubmit={handleSave}>
            <Field label="Nama Produk">
              <input
                style={inputStyle}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                placeholder="Contoh: Kopi Susu 250ml"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>

            <Field label="Harga Jual (Rp)">
              <input
                type="number"
                min="0"
                style={inputStyle}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                placeholder="Contoh: 6000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </Field>

            <Field label="Jumlah Stok">
              <input
                type="number"
                min="0"
                style={inputStyle}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                placeholder="Contoh: 50"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                required
              />
            </Field>

            <Btn type="submit" className="w-full mt-3 !py-2.5" icon={PackageCheck} disabled={loading}>
              {loading ? "Menyimpan..." : editingItem ? "Simpan Perubahan" : "Simpan Produk"}
            </Btn>
          </form>
        </Modal>
      )}
    </div>
  );
}
