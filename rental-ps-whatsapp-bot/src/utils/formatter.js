function formatRupiah(number) {
  return "Rp " + Number(number || 0).toLocaleString("id-ID");
}

function formatDateIndo(dateStr) {
  if (!dateStr) return "-";
  const [year, month, day] = dateStr.split("-");
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  const mIndex = parseInt(month, 10) - 1;
  return `${parseInt(day, 10)} ${months[mIndex] || month} ${year}`;
}

function formatBookingCode(id) {
  if (!id) return "-";
  return `RNT-${String(id).padStart(5, "0")}`;
}

function parseBookingCode(input) {
  if (!input) return null;
  const match = String(input).match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

const templates = {
  mainMenu: () => `🎮 *RENTAL PLAYSTATION BOT* 🎮

Halo! Ada yang bisa kami bantu?

1️⃣ *Cek PS Tersedia*
2️⃣ *Daftar Harga Rental*
3️⃣ *Booking PS*
4️⃣ *Cek Status Booking*
5️⃣ *Batalkan Booking*
6️⃣ *Informasi Rental*
7️⃣ *Hubungi Admin*

_Anda juga bisa langsung mengetik pesan natural, contoh:_
"PS5 kosong besok jam 7 malam?"`,

  catalog: (units) => {
    if (!units || units.length === 0) {
      return "📋 *DAFTAR HARGA RENTAL PS*\n\nSaat ini belum ada data unit yang tersedia.";
    }
    let msg = "📋 *DAFTAR HARGA & BILIK PLAYSTATION*\n\n";
    const grouped = {};
    for (const u of units) {
      if (!grouped[u.type]) grouped[u.type] = [];
      grouped[u.type].push(u);
    }

    for (const [type, list] of Object.entries(grouped)) {
      const rate = list[0] ? formatRupiah(list[0].rate) : "-";
      msg += `🎮 *${type}* (${rate}/jam)\n`;
      list.forEach((u) => {
        const statusIcon = u.status === "idle" ? "🟢 Kosong" : "🔴 Terpakai";
        msg += `   • ${u.name}: ${statusIcon}\n`;
      });
      msg += "\n";
    }
    msg += "Ketik *3* atau *Booking PS* untuk mulai melakukan pemesanan!";
    return msg;
  },

  info: (infoData) => `📍 *INFORMASI RENTAL PS*

🏢 *Nama*: ${infoData.name || "Rental PS System"}
📌 *Alamat*: ${infoData.address || "Jl. Pemuda No. 123, Kota Rental"}
⏰ *Jam Operasional*: ${infoData.operatingHours || "09:00 - 24:00 WIB"}
📞 *Kontak Admin*: ${infoData.adminContact || "+6281234567890"}

${infoData.description || ""}`,

  humanHandoff: (adminPhone) => `👨‍💼 *HUBUNGI ADMIN*

Percakapan otomatis telah dialihkan ke Admin.
Silakan tunggu beberapa saat atau hubungi langsung admin kami di:
📞 ${adminPhone}

_Ketik *#bot* atau *0* kapan saja untuk kembali ke mode Bot otomatis._`,

  bookingConfirmation: (details) => `🎮 *KONFIRMASI BOOKING*

PlayStation : *${details.unitType || "PS"}* (${details.unitName || "-"})
Nama        : *${details.customerName}*
Tanggal     : *${formatDateIndo(details.date)}*
Jam         : *${details.time}* (${details.durationHours} Jam)
Total Estimasi : *${formatRupiah(details.totalPrice)}*

Apakah data booking di atas sudah benar?

1️⃣ *Ya, Lanjutkan Booking*
2️⃣ *Ubah Data*
3️⃣ *Batal*`,
};

module.exports = {
  formatRupiah,
  formatDateIndo,
  formatBookingCode,
  parseBookingCode,
  templates,
};
