import React, { useState } from "react";
import { Coffee, Plus, Trash2, Edit2, AlertTriangle, PackageCheck } from "lucide-react";
import { C, inputStyle } from "../styles/tokens.js";
import { Card, Btn, Field, Modal } from "./ui.jsx";
import { fmtIDR } from "../utils/format.js";

export default function KantinTab({ addons = [], onRefresh }) {
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
          <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold truncate">
            Stok &amp; Kantin
          </h1>
          <p style={{ color: C.textDim }} className="text-xs sm:text-sm mt-0.5 sm:mt-1 truncate sm:whitespace-normal">
            Kelola snack &amp; minuman rental.
          </p>
        </div>
        <Btn icon={Plus} onClick={openAdd} className="shrink-0">
          Tambah Produk
        </Btn>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {addons.map((a) => {
          const isLowStock = (a.stock ?? 100) < 10;
          return (
            <Card key={a.id} className="relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "rgba(139,107,255,0.15)", color: C.violet }}
                    >
                      <Coffee size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm sm:text-base truncate">{a.name}</div>
                      <div className="text-xs font-semibold text-emerald-400">{fmtIDR(a.price)}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 p-2 rounded-xl bg-gray-800/40 flex items-center justify-between text-xs">
                  <span style={{ color: C.textDim }}>Sisa Stok:</span>
                  <span className={`font-bold ${isLowStock ? "text-amber-400" : "text-white"}`}>
                    {a.stock ?? 100} unit
                  </span>
                </div>

                {isLowStock && (
                  <div className="mt-2 text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                    <AlertTriangle size={12} /> Stok menipis, isi ulang!
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-800/80">
                <Btn
                  variant="secondary"
                  icon={Edit2}
                  onClick={() => openEdit(a)}
                  className="flex-1 py-1.5 text-xs"
                >
                  Edit
                </Btn>
                <Btn
                  variant="danger"
                  icon={Trash2}
                  onClick={() => handleDelete(a.id)}
                  className="py-1.5 px-3 text-xs"
                />
              </div>
            </Card>
          );
        })}
      </div>

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

            <Btn type="submit" className="w-full mt-3" icon={PackageCheck} disabled={loading}>
              {loading ? "Menyimpan..." : editingItem ? "Simpan Perubahan" : "Simpan Produk"}
            </Btn>
          </form>
        </Modal>
      )}
    </div>
  );
}
