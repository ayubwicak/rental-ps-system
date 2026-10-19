import React, { useState, useEffect } from "react";
import {
  UserPlus,
  KeyRound,
  Shield,
  Trash2,
  CheckCircle2,
  AlertCircle,
  History,
  RefreshCw,
} from "lucide-react";
import { C, inputStyle } from "../styles/tokens.js";
import { Card, Btn, Field, Modal, Badge } from "./ui.jsx";
import { api } from "../api.js";
import { fmtDateTimeWIB } from "../utils/format.js";

const AUDIT_LABEL = {
  LOGIN: "Login",
  LOGIN_GAGAL: "Login gagal",
  LOGOUT: "Logout",
  PASSWORD_UBAH: "Password diubah",
  PASSWORD_GAGAL: "Ganti password gagal",
  USER_TAMBAH: "User ditambah",
  USER_HAPUS: "User dihapus",
  SESI_MULAI: "Sesi dimulai",
  SESI_PINDAH: "Pindah unit",
  TRANSAKSI: "Transaksi",
  BOOKING_TAMBAH: "Booking baru",
  BOOKING_BATAL: "Booking dibatalkan",
  BOOKING_CHECKIN: "Check-in booking",
  ADDON_TAMBAH: "Add-on ditambah",
  ADDON_UBAH: "Add-on diubah",
  ADDON_HAPUS: "Add-on dihapus",
  MEMBER_TAMBAH: "Member ditambah",
};

function auditTone(action) {
  if (action === "LOGIN_GAGAL" || action === "PASSWORD_GAGAL") return "danger";
  if (action === "TRANSAKSI") return "success";
  if (action === "LOGIN" || action === "SESI_MULAI") return "primary";
  return "neutral";
}

export default function UsersTab({ currentUser, onLogout }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Log aktivitas (admin)
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

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

  const loadAuditLogs = async () => {
    if (currentUser.role !== "admin") return;
    setAuditLoading(true);
    try {
      const rows = await api.getAuditLogs(100);
      setAuditLogs(rows);
    } catch (e) {
      console.error(e);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadAuditLogs();
  }, [currentUser]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdMsg({ error: "", success: "" });
    setPwdLoading(true);
    try {
      await api.changePassword({ oldPassword, newPassword });
      setPwdMsg({
        error: "",
        success: "Password berhasil diperbarui. Anda akan diarahkan ke halaman login...",
      });
      setOldPassword("");
      setNewPassword("");
      setTimeout(() => onLogout && onLogout(), 1500);
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
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3 mb-5">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">User &amp; Akses</h1>
          <p style={{ color: C.textDim }} className="text-[13px] mt-1">
            Pengaturan akun pengelola &amp; hak akses.
          </p>
        </div>
        {currentUser.role === "admin" && (
          <Btn icon={UserPlus} onClick={() => setShowAddModal(true)} className="shrink-0">
            Tambah User
          </Btn>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Form Ganti Password (Untuk semua user yang sedang login) */}
        <Card className="lg:col-span-1">
          <div className="flex items-center gap-2 font-semibold text-[15px] mb-4">
            <KeyRound size={18} style={{ color: C.primary }} />
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
                placeholder="Minimal 8 karakter"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <span className="text-[11px] mt-1 block" style={{ color: C.textFaint }}>
                Minimal 8 karakter. Semua sesi login lain akan berakhir.
              </span>
            </Field>

            {pwdMsg.error && (
              <div className="text-xs font-medium mb-3 flex items-center gap-1.5" style={{ color: C.danger }}>
                <AlertCircle size={14} /> {pwdMsg.error}
              </div>
            )}
            {pwdMsg.success && (
              <div className="text-xs font-medium mb-3 flex items-center gap-1.5" style={{ color: C.success }}>
                <CheckCircle2 size={14} /> {pwdMsg.success}
              </div>
            )}

            <Btn type="submit" className="w-full mt-2 !py-2.5" disabled={pwdLoading}>
              {pwdLoading ? "Memproses..." : "Perbarui Password"}
            </Btn>
          </form>
        </Card>

        {/* Tabel Daftar Pengguna (Hanya Admin) */}
        {currentUser.role === "admin" && (
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4 gap-2">
              <div className="flex items-center gap-2 font-semibold text-[15px]">
                <Shield size={18} style={{ color: C.success }} />
                <span>Daftar Pengguna Sistem</span>
              </div>
              <span className="text-xs shrink-0" style={{ color: C.textDim }}>
                {users.length} pengguna
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr style={{ color: C.textDim }} className="border-b">
                    <th className="pb-2.5 pr-3 font-medium">Nama</th>
                    <th className="pb-2.5 pr-3 font-medium">Username</th>
                    <th className="pb-2.5 pr-3 font-medium">Hak Akses</th>
                    <th className="pb-2.5 text-right font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b last:border-0" style={{ borderColor: C.inset }}>
                      <td className="py-3 pr-3 font-medium" style={{ color: C.text }}>{u.name}</td>
                      <td className="py-3 pr-3 font-mono" style={{ color: C.textDim }}>{u.username}</td>
                      <td className="py-3 pr-3">
                        <Badge tone={u.role === "admin" ? "primary" : "neutral"}>
                          {u.role.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        {u.id !== currentUser.id && (
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            style={{ background: C.dangerSoft, color: C.danger, border: `1px solid ${C.dangerBorder}` }}
                            className="p-1.5 rounded-md hover:brightness-95 transition-all"
                            title="Hapus Pengguna"
                            aria-label="Hapus pengguna"
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

      {currentUser.role === "admin" && (
        <Card>
          <div className="flex items-center justify-between mb-4 gap-2">
            <div className="flex items-center gap-2 font-semibold text-[15px]">
              <History size={18} style={{ color: C.warning }} />
              <span>Log Aktivitas</span>
            </div>
            <Btn
              variant="ghost"
              icon={RefreshCw}
              onClick={loadAuditLogs}
              disabled={auditLoading}
              className="!px-2.5 !py-1.5 !text-xs"
            >
              {auditLoading ? "Memuat..." : "Muat ulang"}
            </Btn>
          </div>

          {auditLogs.length === 0 ? (
            <p className="text-xs py-4" style={{ color: C.textDim }}>
              Belum ada aktivitas tercatat.
            </p>
          ) : (
            <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0" style={{ background: C.surface }}>
                  <tr style={{ color: C.textDim }} className="border-b">
                    <th className="pb-2.5 pr-3 font-medium whitespace-nowrap">Waktu</th>
                    <th className="pb-2.5 pr-3 font-medium">Pengguna</th>
                    <th className="pb-2.5 pr-3 font-medium">Aksi</th>
                    <th className="pb-2.5 font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0" style={{ borderColor: C.inset }}>
                      <td className="py-2.5 pr-3 font-mono whitespace-nowrap" style={{ color: C.textDim }}>
                        {fmtDateTimeWIB(log.created_at)}
                      </td>
                      <td className="py-2.5 pr-3 font-mono whitespace-nowrap" style={{ color: C.text }}>
                        {log.username}
                      </td>
                      <td className="py-2.5 pr-3">
                        <Badge tone={auditTone(log.action)}>
                          {AUDIT_LABEL[log.action] || log.action}
                        </Badge>
                      </td>
                      <td className="py-2.5" style={{ color: C.textDim }}>
                        {log.detail || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

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
                placeholder="Minimal 8 karakter"
                minLength={8}
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
              <div className="text-xs font-medium mb-2 flex items-center gap-1.5" style={{ color: C.danger }}>
                <AlertCircle size={14} /> {addMsg}
              </div>
            )}

            <Btn type="submit" className="w-full mt-3 !py-2.5" icon={UserPlus}>
              Simpan Pengguna
            </Btn>
          </form>
        </Modal>
      )}
    </div>
  );
}
