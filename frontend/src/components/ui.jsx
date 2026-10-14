import React from "react";
import { X } from "lucide-react";
import { C } from "../styles/tokens.js";

export function Badge({ children, tone = "dim" }) {
  const tones = {
    idle: { bg: "rgba(63,221,160,0.15)", fg: C.mint },
    active: { bg: "rgba(255,110,78,0.15)", fg: C.coral },
    dim: { bg: C.surface2, fg: C.textDim },
    violet: { bg: "rgba(139,107,255,0.15)", fg: C.violet },
  };
  const t = tones[tone] || tones.dim;
  return (
    <span
      style={{ background: t.bg, color: t.fg }}
      className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[11px] sm:text-xs font-semibold tracking-wide inline-flex items-center gap-1 shrink-0"
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
    primary: { background: C.violet, color: "#fff" },
    secondary: { background: C.surface2, color: C.text, border: `1px solid ${C.border}` },
    ghost: { background: "transparent", color: C.text, border: `1px solid ${C.border}` },
    danger: { background: C.coral, color: "#fff" },
    subtle: { background: C.surface2, color: C.text },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{ ...styles[variant], opacity: disabled ? 0.5 : 1 }}
      className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer active:scale-95 hover:brightness-110 disabled:cursor-not-allowed whitespace-nowrap shrink-0 touch-manipulation select-none ${className}`}
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
      className={`rounded-2xl p-4 sm:p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function Modal({ title, onClose, children, width = "max-w-md" }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      style={{ background: "rgba(8,6,14,0.75)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: C.surface, border: `1px solid ${C.border}` }}
        className={`w-full ${width} rounded-2xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto shadow-2xl`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ color: C.text }} className="text-base sm:text-lg font-bold truncate pr-2">
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{ color: C.textDim }}
            className="hover:text-white p-1.5 rounded-lg shrink-0 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span style={{ color: C.textDim }} className="text-xs font-semibold uppercase tracking-wide">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export function EmptyState({ text }) {
  return (
    <div
      style={{ border: `1px dashed ${C.border}`, color: C.textDim }}
      className="rounded-2xl p-8 sm:p-10 text-center text-xs sm:text-sm flex flex-col items-center gap-2"
    >
      {text}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <Card className="p-3.5 sm:p-5">
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div
          style={{ background: `${tone}22` }}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0"
        >
          <Icon size={18} color={tone} />
        </div>
        <div className="min-w-0">
          <div style={{ color: C.textDim }} className="text-[11px] sm:text-xs font-semibold truncate">
            {label}
          </div>
          <div className="font-display font-bold text-base sm:text-lg truncate">{value}</div>
        </div>
      </div>
    </Card>
  );
}
