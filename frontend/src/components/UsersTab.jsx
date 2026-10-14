import React, { useState, useEffect } from "react";
import { UserPlus, KeyRound, Shield, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { C, inputStyle } from "../styles/tokens.js";
import { Card, Btn, Field, Modal, Badge } from "./ui.jsx";
import { api } from "../api.js";

export default function UsersTab({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Change password form
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwdMsg, setPwdMsg] = useState({ error: "", success: "" });
  const [pwdLoading, setPwdLoading] = useState(false);

  // Add user form
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("kasir");
  const [addMsg, setAddMsg] = useState("");

  const loadUsers = async () => {
    if (currentUser.role !== "admin") return;
    setLoading(true);
    try {
      const list = await api.getUsers();
      setUsers(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [currentUser]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdMsg({ error: "", success: "" });
    setPwdLoading(true);
    try {
      await api.changePassword({ oldPassword, newPassword });
      setPwdMsg({ error: "", success: "Password Anda berhasil diperbarui!" });
      setOldPassword("");
      setNewPassword("");
    } catch (err) {
      setPwdMsg({ error: err.message, success: "" });
    } finally {
      setPwdLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setAddMsg("");
    try {
      await api.addUser({ username, password, name, role });
      setShowAddModal(false);
      setUsername("");
      setName("");
      setPassword("");
      loadUsers();
    } catch (err) {
      setAddMsg(err.message);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm("Yakin ingin menghapus pengguna ini?")) return;
    try {
      await api.deleteUser(id);
      loadUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between gap-3 mb-5">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold truncate">User &amp; Akses</h1>
          <p style={{ color: C.textDim }} className="text-xs sm:text-sm mt-0.5 sm:mt-1 truncate sm:whitespace-normal">
            Pengaturan akun pengelola &amp; hak akses.
          </p>
        </div>
        {currentUser.role === "admin" && (
          <Btn icon={UserPlus} onClick={() => setShowAddModal(true)} className="shrink-0">
            Tambah User
          </Btn>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Ganti Password (Untuk semua user yang sedang login) */}
        <Card className="lg:col-span-1">
          <div className="flex items-center gap-2 font-bold text-lg mb-4">
            <KeyRound size={20} className="text-violet-400" />
            <span>Ganti Kata Sandi</span>
          </div>

          <form onSubmit={handleChangePassword}>
            <Field label="Kata Sandi Saat Ini">
              <input
                type="password"
                style={inputStyle}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                placeholder="••••••••"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
              />
            </Field>

            <Field label="Kata Sandi Baru">
              <input
                type="password"
                style={inputStyle}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </Field>

            {pwdMsg.error && (
              <div className="text-xs font-semibold text-red-400 mb-3 flex items-center gap-1">
                <AlertCircle size={14} /> {pwdMsg.error}
              </div>
            )}
            {pwdMsg.success && (
              <div className="text-xs font-semibold text-emerald-400 mb-3 flex items-center gap-1">
                <CheckCircle2 size={14} /> {pwdMsg.success}
              </div>
            )}

            <Btn type="submit" className="w-full mt-2" disabled={pwdLoading}>
              {pwdLoading ? "Memproses..." : "Perbarui Password"}
            </Btn>
          </form>
        </Card>

        {/* Tabel Daftar Pengguna (Hanya Admin) */}
        {currentUser.role === "admin" && (
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between font-bold text-lg mb-4">
              <div className="flex items-center gap-2">
                <Shield size={20} className="text-emerald-400" />
                <span>Daftar Pengguna Sistem</span>
              </div>
              <span className="text-xs font-normal" style={{ color: C.textDim }}>
                {users.length} pengguna terdaftar
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400">
                    <th className="pb-2">NAMA</th>
                    <th className="pb-2">USERNAME</th>
                    <th className="pb-2">HAK AKSES</th>
                    <th className="pb-2 text-right">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="py-3 font-semibold text-white">{u.name}</td>
                      <td className="py-3 font-mono">{u.username}</td>
                      <td className="py-3">
                        <Badge tone={u.role === "admin" ? "active" : "idle"}>
                          {u.role.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        {u.id !== currentUser.id && (
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20"
                            title="Hapus Pengguna"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {showAddModal && (
        <Modal title="Tambah Pengguna Baru" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAddUser}>
            <Field label="Nama Lengkap">
              <input
                style={inputStyle}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                placeholder="Contoh: Andi Kasir"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </Field>

            <Field label="Username">
              <input
                style={inputStyle}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                placeholder="kasir1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </Field>

            <Field label="Password">
              <input
                type="password"
                style={inputStyle}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>

            <Field label="Hak Akses (Role)">
              <select
                style={inputStyle}
                className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="kasir">Kasir</option>
                <option value="admin">Admin (Akses Penuh)</option>
              </select>
            </Field>

            {addMsg && (
              <div className="text-xs text-red-400 font-semibold mb-2 flex items-center gap-1">
                <AlertCircle size={14} /> {addMsg}
              </div>
            )}

            <Btn type="submit" className="w-full mt-3" icon={UserPlus}>
              Simpan Pengguna
            </Btn>
          </form>
        </Modal>
      )}
    </div>
  );
}
