import React from "react";
import { Wallet, Receipt, BarChart3, Trophy, Download, Clock, ExternalLink } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  Tooltip as RTooltip,
  AreaChart,
  Area,
} from "recharts";
import { C } from "../styles/tokens.js";
import { Card, StatCard, EmptyState, Btn } from "./ui.jsx";
import { fmtIDR, fmtClock, fmtDateTimeWIB } from "../utils/format.js";
import { api } from "../api.js";

// Cegah XSS pada laporan HTML yang dibuka di tab baru (nama pelanggan/unit dari input pengguna)
const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Cegah CSV formula injection saat file dibuka di Excel/Spreadsheet
const csvSafe = (value) => {
  const s = String(value ?? "");
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
};

export default function LaporanTab({ summary }) {
  if (!summary) return null;
  const { totalRevenue, totalSessions, todayRevenue, todayCount, byUnit, hourlyData = [] } = summary;
  const avgTicket = totalSessions ? totalRevenue / totalSessions : 0;
  const busiest = [...byUnit].sort((a, b) => b.omset - a.omset)[0];

  // Format hourly chart data (00:00 - 23:00)
  const fullHours = Array.from({ length: 24 }, (_, i) => {
    const hourStr = i.toString().padStart(2, "0");
    const found = hourlyData.find((h) => h.hour === hourStr);
    return {
      hour: `${hourStr}:00`,
      count: found ? found.count : 0,
      total: found ? found.total : 0,
    };
  });

  const openInBrowser = async () => {
    try {
      const txs = await api.getTransactions();
      const todayStr = new Date().toISOString().slice(0, 10);
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("Popup diblokir oleh browser. Izinkan popup untuk membuka laporan di tab baru.");
        return;
      }

      const unitRowsHtml = (byUnit || [])
        .map(
          (u) => `<tr>
            <td style="padding:10px; border-bottom:1px solid #e2e8f0; font-weight:600;">${escapeHtml(u.name)}</td>
            <td style="padding:10px; border-bottom:1px solid #e2e8f0; text-align:right; font-family:monospace; font-weight:bold; color:#059669;">${fmtIDR(u.omset)}</td>
          </tr>`
        )
        .join("");

      const hourlyRowsHtml = fullHours
        .map(
          (h) => `<tr>
            <td style="padding:8px 10px; border-bottom:1px solid #f1f5f9;">${escapeHtml(h.hour)}</td>
            <td style="padding:8px 10px; border-bottom:1px solid #f1f5f9; text-align:center; font-weight:bold;">${h.count} Sesi</td>
            <td style="padding:8px 10px; border-bottom:1px solid #f1f5f9; text-align:right; font-family:monospace; color:#2563eb;">${fmtIDR(h.total)}</td>
          </tr>`
        )
        .join("");

      const txRowsHtml = (txs || [])
        .map(
          (t) => `<tr>
            <td style="padding:8px 10px; border-bottom:1px solid #f1f5f9; font-weight:bold;">#${t.id}</td>
            <td style="padding:8px 10px; border-bottom:1px solid #f1f5f9;">${fmtDateTimeWIB(t.created_at)}</td>
            <td style="padding:8px 10px; border-bottom:1px solid #f1f5f9; font-weight:600; color:#2563eb;">${escapeHtml(t.unit_name)}</td>
            <td style="padding:8px 10px; border-bottom:1px solid #f1f5f9;">${escapeHtml(t.customer_name)}</td>
            <td style="padding:8px 10px; border-bottom:1px solid #f1f5f9; text-align:center;">${fmtClock(t.duration_sec)}</td>
            <td style="padding:8px 10px; border-bottom:1px solid #f1f5f9; text-align:right; font-family:monospace;">${fmtIDR(t.rental_cost)}</td>
            <td style="padding:8px 10px; border-bottom:1px solid #f1f5f9; text-align:right; font-family:monospace;">${fmtIDR(t.addons_cost)}</td>
            <td style="padding:8px 10px; border-bottom:1px solid #f1f5f9; text-align:right; font-family:monospace; color:#dc2626;">-${fmtIDR(t.discount_amount || 0)}</td>
            <td style="padding:8px 10px; border-bottom:1px solid #f1f5f9; text-align:right; font-family:monospace; font-weight:bold; color:#059669;">${fmtIDR(t.total)}</td>
            <td style="padding:8px 10px; border-bottom:1px solid #f1f5f9; text-transform:uppercase; font-size:11px; font-weight:bold;">${escapeHtml(t.payment_method)}</td>
          </tr>`
        )
        .join("");

      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="id">
        <head>
          <meta charset="UTF-8">
          <title>Laporan & Analitik RentalKu - ${todayStr}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 24px; background: #f8fafc; color: #1e293b; }
            .container { max-width: 1000px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; }
            .title { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; }
            .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
            .no-print { margin-bottom: 20px; display: flex; gap: 10px; justify-content: flex-end; }
            .btn-print { background: #2563eb; color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: 600; cursor: pointer; }
            .btn-print:hover { background: #1d4ed8; }
            .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
            .stat-card { background: #f1f5f9; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; }
            .stat-label { font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; }
            .stat-value { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 4px; font-family: monospace; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
            th { background: #f8fafc; color: #475569; font-size: 11px; text-transform: uppercase; padding: 10px; border-bottom: 2px solid #cbd5e1; text-align: left; }
            .section-title { font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 28px; margin-bottom: 8px; border-left: 4px solid #2563eb; padding-left: 10px; }
            @media print { .no-print { display: none; } body { padding: 0; background: #fff; } .container { box-shadow: none; padding: 0; } }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="no-print">
              <button class="btn-print" onclick="window.print()">Cetak / Simpan PDF</button>
            </div>
            <div class="header">
              <div>
                <h1 class="title">RentalKu — Laporan Usaha</h1>
                <div class="subtitle">Ringkasan Pendapatan &amp; Produktivitas Unit</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:12px; font-weight:bold; color:#6366f1;">TANGGAL LAPORAN</div>
                <div style="font-size:14px; font-weight:bold; color:#0f172a;">${todayStr}</div>
              </div>
            </div>

            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-label">TOTAL OMSET</div>
                <div class="stat-value" style="color:#059669;">${fmtIDR(totalRevenue)}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">TOTAL SESI SELESAI</div>
                <div class="stat-value" style="color:#4f46e5;">${totalSessions} Sesi</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">RATA-RATA / SESI</div>
                <div class="stat-value" style="color:#d97706;">${fmtIDR(avgTicket)}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">UNIT TERLARIS</div>
                <div class="stat-value" style="color:#e11d48; font-size:14px;">${escapeHtml(busiest && busiest.omset > 0 ? busiest.name : "-")}</div>
              </div>
            </div>

            <div class="section-title">Ringkasan Produktivitas Unit</div>
            <table>
              <thead>
                <tr><th>NAMA BILIK / UNIT</th><th style="text-align:right;">TOTAL OMSET (RP)</th></tr>
              </thead>
              <tbody>${unitRowsHtml}</tbody>
            </table>

            <div class="section-title">Analisis Jam Sibuk (09:00 - 24:00 WIB)</div>
            <table>
              <thead>
                <tr><th>JAM OPERASIONAL</th><th style="text-align:center;">JUMLAH SESI</th><th style="text-align:right;">TOTAL OMSET (RP)</th></tr>
              </thead>
              <tbody>${hourlyRowsHtml}</tbody>
            </table>

            <div class="section-title">Rincian Riwayat Transaksi</div>
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>WAKTU</th><th>UNIT</th><th>PELANGGAN</th><th style="text-align:center;">DURASI</th>
                  <th style="text-align:right;">SEWA</th><th style="text-align:right;">KANTIN</th><th style="text-align:right;">DISKON</th>
                  <th style="text-align:right;">TOTAL</th><th>BAYAR</th>
                </tr>
              </thead>
              <tbody>${txRowsHtml || '<tr><td colspan="10" style="text-align:center; padding:16px;">Belum ada data transaksi.</td></tr>'}</tbody>
            </table>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
    } catch (e) {
      alert(e.message || "Gagal membuka laporan di browser.");
    }
  };

  const exportCSV = async () => {
    try {
      const txs = await api.getTransactions();
      const todayStr = new Date().toISOString().slice(0, 10);

      const csvLines = [];
      csvLines.push("=== LAPORAN & ANALITIK RENTAL PLAYSTATION (RentalKu) ===");
      csvLines.push(`Tanggal Cetak,${todayStr}`);
      csvLines.push(`Total Pendapatan (Omset),${totalRevenue}`);
      csvLines.push(`Total Sesi Selesai,${totalSessions}`);
      csvLines.push(`Rata-rata Transaksi (Ticket Size),${Math.round(avgTicket)}`);
      csvLines.push(`Unit Terlaris,"${csvSafe(busiest && busiest.omset > 0 ? busiest.name : "-")}"`);
      csvLines.push("");

      csvLines.push("=== RINGKASAN PRODUKTIVITAS PER UNIT ===");
      csvLines.push("Nama Unit,Total Omset (Rp)");
      (byUnit || []).forEach((u) => {
        csvLines.push(`"${csvSafe(u.name)}",${u.omset}`);
      });
      csvLines.push("");

      csvLines.push("=== ANALISIS JAM SIBUK (DISTRIBUSI PER JAM) ===");
      csvLines.push("Jam,Jumlah Sesi,Total Omset (Rp)");
      fullHours.forEach((h) => {
        csvLines.push(`"${h.hour}",${h.count},${h.total}`);
      });
      csvLines.push("");

      csvLines.push("=== RINCIAN RIWAYAT TRANSAKSI ===");
      csvLines.push("ID,Waktu,Unit,Pelanggan,Durasi (Detik),Biaya Sewa,Biaya Addon/Kantin,Diskon,Total,Metode Pembayaran");

      if (txs && txs.length > 0) {
        txs.forEach((t) => {
          csvLines.push([
            t.id,
            `"${t.created_at}"`,
            `"${csvSafe(t.unit_name)}"`,
            `"${csvSafe(t.customer_name)}"`,
            t.duration_sec,
            t.rental_cost,
            t.addons_cost,
            t.discount_amount || 0,
            t.total,
            `"${csvSafe(t.payment_method)}"`,
          ].join(","));
        });
      } else {
        csvLines.push("Belum ada data transaksi.");
      }

      const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvLines.join("\n"));
      const link = document.createElement("a");
      link.setAttribute("href", csvContent);
      link.setAttribute("download", `Laporan_Analitik_RentalKu_${todayStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert(e.message || "Gagal meng-export laporan CSV.");
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3 mb-5">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">Laporan &amp; Analitik</h1>
          <p style={{ color: C.textDim }} className="text-[13px] mt-1">
            Ringkasan pendapatan &amp; jam sibuk rental.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="relative group shrink-0">
            <Btn
              icon={ExternalLink}
              onClick={openInBrowser}
              variant="primary"
              title="Buka Laporan di Browser Tab Baru"
              aria-label="Buka Laporan di Browser Tab Baru"
              className="!px-3 !py-2.5 sm:!px-3.5 sm:!py-2.5 shrink-0"
            >
              <span className="hidden sm:inline">Buka di Browser</span>
            </Btn>
            <div
              style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.textDim }}
              className="absolute right-0 top-full mt-1.5 hidden group-hover:flex items-center gap-1 z-30 px-2.5 py-1 text-[11px] font-medium rounded-lg shadow-md whitespace-nowrap pointer-events-none transition-all"
            >
              Tampilkan Laporan di Tab Browser
            </div>
          </div>

          <div className="relative group shrink-0">
            <Btn
              icon={Download}
              onClick={exportCSV}
              variant="secondary"
              title="Download File CSV"
              aria-label="Download File CSV"
              className="!px-3 !py-2.5 sm:!px-3.5 sm:!py-2.5 shrink-0"
            />
            <div
              style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.textDim }}
              className="absolute right-0 top-full mt-1.5 hidden group-hover:flex items-center gap-1 z-30 px-2.5 py-1 text-[11px] font-medium rounded-lg shadow-md whitespace-nowrap pointer-events-none transition-all"
            >
              Download File CSV
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={Wallet} label="Total Omset" value={fmtIDR(totalRevenue)} tone={C.success} />
        <StatCard icon={Receipt} label="Total Sesi" value={totalSessions} tone={C.primary} />
        <StatCard icon={BarChart3} label="Rata-rata / Sesi" value={fmtIDR(avgTicket)} tone={C.primaryDark} />
        <StatCard icon={Trophy} label="Unit Terlaris" value={busiest && busiest.omset > 0 ? busiest.name : "-"} tone={C.warning} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <div className="font-semibold text-[15px] mb-4 flex items-center gap-2">
            <BarChart3 size={17} style={{ color: C.primary }} /> Omset per Unit
          </div>
          {totalRevenue === 0 ? (
            <EmptyState text="Belum ada data transaksi." />
          ) : (
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <BarChart data={byUnit}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                  <XAxis dataKey="name" stroke={C.textDim} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke={C.textDim}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v / 1000}k`}
                  />
                  <RTooltip
                    contentStyle={{
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      color: C.text,
                      boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
                    }}
                    formatter={(v) => fmtIDR(v)}
                  />
                  <Bar dataKey="omset" fill={C.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <div className="font-semibold text-[15px] mb-4 flex items-center gap-2">
            <Clock size={17} style={{ color: C.warning }} /> Jam Ramai (Peak Hours)
          </div>
          {totalSessions === 0 ? (
            <EmptyState text="Belum ada data sesi jam ramai." />
          ) : (
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <AreaChart data={fullHours}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                  <XAxis dataKey="hour" stroke={C.textDim} fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke={C.textDim} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <RTooltip
                    contentStyle={{
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 8,
                      color: C.text,
                      boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
                    }}
                    formatter={(v) => [`${v} Transaksi`, "Jumlah"]}
                  />
                  <Area type="monotone" dataKey="count" stroke="#F59E0B" fill="#F59E0B22" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
