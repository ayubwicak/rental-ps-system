import React from "react";
import { Printer, X } from "lucide-react";
import { Modal, Btn } from "./ui.jsx";
import { fmtIDR, fmtClock, fmtDateTimeWIB } from "../utils/format.js";

export default function PrintReceiptModal({ receiptData, onClose }) {
  if (!receiptData) return null;

  const handlePrint = () => {
    window.print();
  };

  const {
    unitName = "Unit PS",
    customerName = "Pelanggan",
    durationSec = 0,
    rentalCost = 0,
    addonsCost = 0,
    discountAmount = 0,
    total = 0,
    paymentMethod = "cash",
    transactionId = "-",
    createdAt = new Date().toISOString(),
  } = receiptData;

  const dateStr = fmtDateTimeWIB(createdAt);

  return (
    <Modal title="Struk Pembayaran" onClose={onClose}>
      <div className="flex flex-col items-center">
        {/* Rendered receipt box */}
        <div
          id="printable-receipt"
          className="w-full max-w-[280px] bg-white text-black p-4 rounded-lg shadow-inner font-mono text-xs mb-4 select-none leading-relaxed border border-gray-300"
        >
          <div className="text-center font-bold text-sm uppercase tracking-wide border-b border-dashed border-gray-400 pb-2 mb-2">
            RentalKu PS
            <div className="text-[10px] font-normal normal-case text-gray-600">
              Sistem Penyewaan PlayStation
            </div>
          </div>

          <div className="flex justify-between text-[10px] text-gray-500 mb-1">
            <span>No: #{transactionId}</span>
            <span>{dateStr}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="font-semibold">{unitName}</span>
            <span>{customerName}</span>
          </div>

          <div className="border-t border-dashed border-gray-300 pt-2 mb-2 space-y-1">
            <div className="flex justify-between">
              <span>Sewa ({fmtClock(durationSec)})</span>
              <span>{fmtIDR(rentalCost)}</span>
            </div>
            {addonsCost > 0 && (
              <div className="flex justify-between">
                <span>Tambahan (Snack/Minum)</span>
                <span>{fmtIDR(addonsCost)}</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="flex justify-between text-red-600 font-semibold">
                <span>Potongan / Diskon</span>
                <span>-{fmtIDR(discountAmount)}</span>
              </div>
            )}
          </div>

          <div className="border-t border-b border-dashed border-gray-400 py-1.5 mb-2">
            <div className="flex justify-between font-bold text-sm">
              <span>TOTAL</span>
              <span>{fmtIDR(total)}</span>
            </div>
            <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
              <span>Metode Bayar</span>
              <span className="uppercase font-semibold">{paymentMethod}</span>
            </div>
          </div>

          <div className="text-center text-[10px] text-gray-500 mt-3 pt-1 border-t border-dashed border-gray-200">
            Terima kasih telah bermain di RentalKu!
            <br />
            Semoga harimu menyenangkan.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 w-full">
          <Btn variant="secondary" icon={X} onClick={onClose} className="flex-1">
            Tutup
          </Btn>
          <Btn icon={Printer} onClick={handlePrint} className="flex-1">
            Cetak Struk
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
