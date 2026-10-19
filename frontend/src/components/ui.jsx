import React from "react";
import { X, Inbox } from "lucide-react";
import { C } from "../styles/tokens.js";

export function Badge({ children, tone = "neutral" }) {
  const tones = {
    neutral: { bg: C.inset, fg: C.textDim, border: C.border },
    success: { bg: C.successSoft, fg: C.success, border: C.successBorder },
    danger: { bg: C.dangerSoft, fg: C.danger, border: C.dangerBorder },
    warning: { bg: C.warningSoft, fg: C.warning, border: C.warningBorder },
    primary: { bg: C.primarySoft, fg: C.primaryDark, border: C.primaryBorder },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span
      style={{ background: t.bg, color: t.fg, border: `1px solid ${t.border}` }}
      className="px-2 py-0.5 rounded-md text-[11px] font-medium inline-flex items-center gap-1 shrink-0 whitespace-nowrap"
    >
      {children}
    </span>
  );
}

export function Btn({
  children,
  onClick,
  variant = "primary",
  className = "",
  disabled,
  icon: Icon,
  type = "button",
  title,
  ...props
}) {
  const styles = {
    primary: { background: C.fillPrimary, color: "#fff", border: "1px solid transparent" },
    secondary: { background: C.surface, color: C.text, border: `1px solid ${C.borderStrong}` },
    ghost: { background: "transparent", color: C.textDim, border: `1px solid ${C.border}` },
    danger: { background: C.fillDanger, color: "#fff", border: "1px solid transparent" },
    dangerGhost: { background: C.dangerSoft, color: C.danger, border: `1px solid ${C.dangerBorder}` },
    subtle: { background: C.inset, color: C.text, border: "1px solid transparent" },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{ ...styles[variant], opacity: disabled ? 0.55 : 1 }}
      className={`px-3.5 py-2 rounded-lg text-[13px] sm:text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-[0.98] disabled:cursor-not-allowed whitespace-nowrap shrink-0 select-none ${className}`}
      {...props}
    >
      {Icon && <Icon size={16} className="shrink-0" />}
      {children}
    </button>
  );
}

export function Card({ children, className = "", style = {} }) {
  return (
    <div
      style={{ background: C.surface, border: `1px solid ${C.border}`, ...style }}
      className={`rounded-xl p-4 sm:p-5 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function Modal({ title, onClose, children, width = "max-w-md" }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      style={{ background: "rgba(15,23,42,0.45)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: C.surface, border: `1px solid ${C.border}` }}
        className={`w-full ${width} rounded-xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto shadow-xl`}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 style={{ color: C.text }} className="text-base sm:text-lg font-semibold truncate pr-2">
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{ color: C.textFaint }}
            className="hover:text-[var(--c-text)] hover:bg-[var(--c-inset)] p-1.5 rounded-lg shrink-0 active:scale-95 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block mb-4">
      <span style={{ color: C.textDim }} className="text-xs font-medium">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export function EmptyState({ text, icon: Icon = Inbox }) {
  return (
    <div
      style={{ border: `1px dashed ${C.borderStrong}`, color: C.textDim, background: C.surface }}
      className="rounded-xl p-8 sm:p-10 text-center text-[13px] flex flex-col items-center gap-2.5"
    >
      <Icon size={22} style={{ color: C.textFaint }} />
      <span className="max-w-sm leading-relaxed">{text}</span>
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, tone = C.primary }) {
  return (
    <Card className="!p-4">
      <div className="flex items-center gap-3">
        <div
          style={{ background: `color-mix(in srgb, ${tone} 12%, transparent)`, color: tone }}
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        >
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <div style={{ color: C.textDim }} className="text-xs font-medium truncate">
            {label}
          </div>
          <div className="font-semibold text-base sm:text-lg truncate tabular tracking-tight">{value}</div>
        </div>
      </div>
    </Card>
  );
}
