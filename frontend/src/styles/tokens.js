// Token warna memakai CSS variables sehingga satu komponen berlaku untuk
// mode terang & gelap. Nilai palet didefinisikan di src/index.css
// (:root untuk terang, .dark untuk gelap).
export const C = {
  bg: "var(--c-bg)",
  surface: "var(--c-surface)",
  surface2: "var(--c-surface2)",
  inset: "var(--c-inset)",
  border: "var(--c-border)",
  borderStrong: "var(--c-borderStrong)",
  text: "var(--c-text)",
  textDim: "var(--c-textDim)",
  textFaint: "var(--c-textFaint)",
  primary: "var(--c-primary)",
  primaryDark: "var(--c-primaryDark)",
  primarySoft: "var(--c-primarySoft)",
  primaryBorder: "var(--c-primaryBorder)",
  fillPrimary: "var(--c-fillPrimary)",
  fillDanger: "var(--c-fillDanger)",
  success: "var(--c-success)",
  successSoft: "var(--c-successSoft)",
  successBorder: "var(--c-successBorder)",
  danger: "var(--c-danger)",
  dangerSoft: "var(--c-dangerSoft)",
  dangerBorder: "var(--c-dangerBorder)",
  warning: "var(--c-warning)",
  warningSoft: "var(--c-warningSoft)",
  warningBorder: "var(--c-warningBorder)",
};

export const inputStyle = {
  background: C.surface,
  border: `1px solid ${C.borderStrong}`,
  color: C.text,
};
