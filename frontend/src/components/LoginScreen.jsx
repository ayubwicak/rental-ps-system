import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Gamepad2,
  Loader2,
  LockKeyhole,
  Moon,
  Sun,
  UserRound,
} from "lucide-react";
import { api } from "../api.js";

const colors = {
  panel: "var(--login-panel)",
  background: "var(--login-bg)",
  mainBg: "var(--login-main-bg)",
  input: "var(--login-input)",
  border: "var(--login-border)",
  text: "var(--login-text)",
  muted: "var(--login-muted)",
  accent: "var(--login-accent)",
  accentFg: "var(--login-accent-fg)",
  stat: "var(--login-stat)",
  errorBg: "var(--login-error-bg)",
  errorBorder: "var(--login-error-border)",
  errorText: "var(--login-error-text)",
};

function Brand({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ background: colors.accent, color: colors.accentFg }}
      >
        <Gamepad2 size={21} strokeWidth={2.3} />
      </div>
      <span
        className="text-lg font-bold tracking-tight"
        style={{ color: colors.text }}
      >
        RentalKu
      </span>
      {!compact && (
        <span className="sr-only">Sistem penyewaan PlayStation</span>
      )}
    </div>
  );
}

function formatCompactIDR(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "—";
  const compact = new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  })
    .format(value)
    .replace(/\s/g, "");
  return `Rp ${compact}`;
}

export default function LoginScreen({ onLogin, theme, onToggleTheme }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    let fetching = false;

    const refreshStats = async () => {
      if (fetching || document.visibilityState === "hidden") return;
      fetching = true;
      try {
        const data = await api.getPublicStats();
        if (active) {
          setStats(data);
          setStatsError(false);
        }
      } catch {
        if (active) setStatsError(true);
      } finally {
        fetching = false;
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refreshStats();
    };
    const timer = setInterval(refreshStats, 15000);
    window.addEventListener("focus", refreshStats);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    refreshStats();

    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", refreshStats);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  const statsCards = [
    {
      value:
        stats?.unitCount == null
          ? "—"
          : Number(stats.unitCount).toLocaleString("id-ID"),
      label: "UNIT",
    },
    {
      value: stats ? formatCompactIDR(stats.todayRevenue) : "—",
      label: "HARI INI",
    },
    {
      value:
        stats?.todayCount == null
          ? "—"
          : Number(stats.todayCount).toLocaleString("id-ID"),
      label: "SESI",
    },
  ];

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Isi username dan password terlebih dahulu.");
      return;
    }
    setLoading(true);
    try {
      const { user } = await api.login(username.trim(), password);
      onLogin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isDark = theme === "dark";

  return (
    <div
      className="grid min-h-screen lg:grid-cols-2"
      style={{ background: colors.background, color: colors.text }}
    >
      <aside
        className="relative hidden min-h-screen flex-col justify-between overflow-hidden border-r p-10 xl:p-14 lg:flex"
        style={{ background: colors.panel, borderColor: colors.border }}
      >
        <Brand />

        <div className="relative z-10 max-w-xl py-14">
          <p
            className="font-mono text-xs font-semibold uppercase tracking-[0.2em]"
            style={{ color: colors.accent }}
          >
            SISTEM KASIR · V2
          </p>
          <h1
            className="mt-5 text-4xl font-extrabold leading-[1.2] tracking-tight xl:text-5xl"
            style={{ color: colors.text }}
          >
            Semua bilik,
            <br />
            satu layar.
          </h1>
          <p
            className="mt-6 max-w-lg text-base leading-relaxed xl:text-lg"
            style={{ color: colors.muted }}
          >
            Pantau timer, kantin, dan booking secara real-time dari PC kasir,
            tablet, maupun HP.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {statsCards.map(({ value, label }) => (
            <div
              key={label}
              className="flex h-[103px] min-w-0 flex-col justify-center rounded-[15px] border px-4 sm:px-[18px]"
              style={{
                background: colors.stat,
                borderColor: colors.border,
              }}
            >
              <div
                className="whitespace-nowrap text-2xl font-bold tracking-tight sm:text-[28px]"
                style={{ color: colors.text }}
              >
                {value}
              </div>
              <div
                className="mt-1.5 font-mono text-[11px] tracking-[0.16em]"
                style={{ color: colors.muted }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>
        <p
          className="mt-2 min-h-4 text-right font-mono text-[9px]"
          style={{ color: statsError ? colors.errorText : colors.muted }}
          role={statsError ? "status" : undefined}
        >
          {statsError ? "Data statistik tidak dapat diperbarui." : "LIVE · DIPERBARUI OTOMATIS"}
        </p>
      </aside>

      <main
        className="relative flex min-h-screen flex-col p-6 sm:p-10 lg:p-12"
        style={{ background: colors.mainBg }}
      >
        <div className="flex items-center justify-between lg:justify-end">
          <div className="lg:hidden">
            <Brand compact />
          </div>
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={isDark ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
            title={isDark ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
            className="flex h-9 w-9 items-center justify-center rounded-lg border transition hover:brightness-110 active:scale-95"
            style={{
              background: colors.input,
              borderColor: colors.border,
              color: colors.muted,
            }}
          >
            {isDark ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}
          </button>
        </div>

        <div className="mx-auto my-auto w-full max-w-[428px] py-12">
          <div className="mb-9 lg:hidden">
            <p
              className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: colors.accent }}
            >
              SISTEM KASIR · V2
            </p>
            <h1
              className="mt-3 text-3xl font-extrabold leading-tight tracking-tight"
              style={{ color: colors.text }}
            >
              Semua bilik, satu layar.
            </h1>
          </div>

          <h2
            className="text-3xl font-bold tracking-tight"
            style={{ color: colors.text }}
          >
            Masuk Staf
          </h2>
          <p className="mt-2 text-sm sm:text-base" style={{ color: colors.muted }}>
            Gunakan akun yang diberikan admin.
          </p>

          <form className="mt-8" onSubmit={submit}>
            <label className="mb-6 block">
              <span
                className="mb-2 block font-mono text-[10px] font-semibold uppercase tracking-[0.16em]"
                style={{ color: colors.muted }}
              >
                Nama pengguna
              </span>
              <span className="relative block">
                <UserRound
                  aria-hidden="true"
                  size={17}
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  style={{ color: colors.muted }}
                />
                <input
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="kasir01"
                  className="h-[54px] w-full rounded-xl border py-3 pl-11 pr-4 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
                  style={{
                    background: colors.input,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                />
              </span>
            </label>

            <label className="mb-6 block">
              <span
                className="mb-2 block font-mono text-[10px] font-semibold uppercase tracking-[0.16em]"
                style={{ color: colors.muted }}
              >
                Kata sandi
              </span>
              <span className="relative block">
                <LockKeyhole
                  aria-hidden="true"
                  size={17}
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  style={{ color: colors.muted }}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-[54px] w-full rounded-xl border py-3 pl-11 pr-12 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
                  style={{
                    background: colors.input,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 transition hover:brightness-125"
                  style={{ color: colors.muted }}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>

            {error && (
              <div
                role="alert"
                className="mb-5 flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium"
                style={{
                  background: colors.errorBg,
                  borderColor: colors.errorBorder,
                  color: colors.errorText,
                }}
              >
                <AlertCircle size={15} className="shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-[54px] w-full items-center justify-center gap-2 rounded-xl font-semibold transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              style={{ background: colors.accent, color: colors.accentFg }}
            >
              {loading ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Memproses...
                </>
              ) : (
                "Masuk"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs" style={{ color: colors.muted }}>
            Lupa kata sandi? Hubungi pemilik.
          </p>
        </div>
      </main>
    </div>
  );
}
