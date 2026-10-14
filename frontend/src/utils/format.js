export const fmtIDR = (n) => "Rp" + Math.round(n || 0).toLocaleString("id-ID");

export const fmtClock = (totalSeconds) => {
  const h = Math.floor(totalSeconds / 3600).toString().padStart(2, "0");
  const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, "0");
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
};

export const fmtDateTimeWIB = (dateInput) => {
  if (!dateInput) return "-";
  let d;
  if (typeof dateInput === "string" && !dateInput.includes("Z") && !dateInput.includes("+")) {
    d = new Date(dateInput.replace(" ", "T") + "Z");
  } else {
    d = new Date(dateInput);
  }
  return (
    d.toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }) + " WIB"
  );
};

export const fmtTimeWIB = (now) => {
  return (
    new Date(now).toLocaleTimeString("id-ID", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }) + " WIB"
  );
};
