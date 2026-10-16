import React, { useState } from "react";
import { Gamepad2, User as UserIcon, Lock, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { C, inputStyle } from "../styles/tokens.js";
import { Btn, Field } from "./ui.jsx";
import { api, saveToken } from "../api.js";

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Isi username dan password terlebih dahulu.");
      return;
    }
    setLoading(true);
    try {
      const { token, user } = await api.login(username.trim(), password);
      saveToken(token);
      onLogin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{ background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif", minHeight: "100vh" }}
      className="flex items-center justify-center p-4 relative overflow-hidden"
    >
      <div
        style={{ background: `radial-gradient(circle at 30% 20%, rgba(139,107,255,0.25), transparent 55%)` }}
        className="absolute inset-0 pointer-events-none"
      />
      <div style={{ background: C.surface, border: `1px solid ${C.border}` }} className="w-full max-w-sm rounded-2xl p-7 relative z-10 scanline">
        <div className="flex flex-col items-center text-center mb-6">
          <div style={{ background: C.violet }} className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3">
            <Gamepad2 size={24} color="#fff" />
          </div>
          <h1 className="font-display text-xl font-bold">Masuk ke RentalKu</h1>
          <p style={{ color: C.textDim }} className="text-xs mt-1">Sistem manajemen penyewaan PlayStation</p>
        </div>

        <form onSubmit={submit}>
          <Field label="Username">
            <div className="relative">
              <UserIcon size={15} style={{ color: C.textDim }} className="absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                style={inputStyle}
                className="w-full rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </Field>
          <Field label="Password">
            <div className="relative">
              <Lock size={15} style={{ color: C.textDim }} className="absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                style={inputStyle}
                className="w-full rounded-lg pl-9 pr-10 py-2.5 text-sm outline-none"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none hover:opacity-80 transition-opacity"
                style={{ color: C.textDim }}
                title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </Field>

          {error && (
            <div style={{ color: C.coral }} className="text-xs font-medium mb-3 flex items-center gap-1.5">
              <AlertCircle size={13} /> {error}
            </div>
          )}

          <Btn type="submit" className="w-full mt-1" icon={CheckCircle2} disabled={loading}>
            {loading ? "Memproses..." : "Masuk"}
          </Btn>
        </form>
      </div>
    </div>
  );
}
