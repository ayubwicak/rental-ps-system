import React, { useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { BellRing, X } from "lucide-react";
import { C } from "./styles/tokens.js";
import { api, setUnauthorizedHandler } from "./api.js";
import { useIsMobile } from "./utils/useIsMobile.js";
import { getPreferredTheme, applyTheme } from "./utils/theme.js";

import LoginScreen from "./components/LoginScreen.jsx";
import Sidebar from "./components/Sidebar.jsx";
import TopBar from "./components/TopBar.jsx";
import DashboardTab from "./components/DashboardTab.jsx";
import UnitsTab from "./components/UnitsTab.jsx";
import KantinTab from "./components/KantinTab.jsx";
import BookingTab, { AddBookingModal } from "./components/BookingTab.jsx";
import RiwayatTab from "./components/RiwayatTab.jsx";
import MemberTab, { AddMemberModal } from "./components/MemberTab.jsx";
import LaporanTab from "./components/LaporanTab.jsx";
import UsersTab from "./components/UsersTab.jsx";
import BottomNav from "./components/BottomNav.jsx";

import StartSessionModal from "./components/StartSessionModal.jsx";
import StopSessionModal from "./components/StopSessionModal.jsx";
import SwitchUnitModal from "./components/SwitchUnitModal.jsx";
import SessionAddonsModal from "./components/SessionAddonsModal.jsx";
import PrintReceiptModal from "./components/PrintReceiptModal.jsx";

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [theme, setTheme] = useState(getPreferredTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  // Pulihkan sesi login dari cookie httpOnly (tidak ada token di localStorage)
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    (async () => {
      try {
        const { user } = await api.me();
        setUser(user);
      } catch {
        setUser(null);
      }
      setCheckingSession(false);
    })();
    return () => setUnauthorizedHandler(null);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Abaikan kegagalan jaringan — sesi lokal tetap diakhiri
    }
    setUser(null);
  }, []);

  if (checkingSession) return null;
  if (!user)
    return <LoginScreen onLogin={setUser} theme={theme} onToggleTheme={toggleTheme} />;
  return (
    <MainApp
      user={user}
      onLogout={handleLogout}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  );
}

function MainApp({ user, onLogout, theme, onToggleTheme }) {
  const [tab, setTab] = useState("dashboard");
  const [units, setUnits] = useState([]);
  const [addons, setAddons] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [members, setMembers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [now, setNow] = useState(Date.now());

  const [startModalUnit, setStartModalUnit] = useState(null);
  const [stopModalUnit, setStopModalUnit] = useState(null);
  const [switchModalUnit, setSwitchModalUnit] = useState(null);
  const [addonsModalUnit, setAddonsModalUnit] = useState(null);
  const [receiptData, setReceiptData] = useState(null);

  const [bookingModal, setBookingModal] = useState(false);
  const [memberModal, setMemberModal] = useState(false);

  const [toast, setToast] = useState(null);

  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  useEffect(() => setDrawerOpen(false), [tab, isMobile]);

  const refreshUnits = useCallback(() => api.getUnits().then(setUnits), []);
  const refreshAddons = useCallback(() => api.getAddons().then(setAddons), []);
  const refreshBookings = useCallback(() => api.getBookings().then(setBookings), []);
  const refreshMembers = useCallback(() => api.getMembers().then(setMembers), []);
  const refreshTransactions = useCallback(() => api.getTransactions().then(setTransactions), []);
  const refreshSummary = useCallback(() => api.getReportSummary().then(setSummary), []);

  // load awal
  useEffect(() => {
    refreshAddons();
    refreshUnits();
    refreshBookings();
    refreshMembers();
    refreshTransactions();
    refreshSummary();
  }, [refreshAddons, refreshUnits, refreshBookings, refreshMembers, refreshTransactions, refreshSummary]);

  // jam berjalan + sinkronisasi real-time via WebSocket
  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(refreshUnits, 15000); // Polling cadangan ditingkatkan ke 15s

    // Real-time listener via WebSocket (Socket.io) — autentikasi memakai cookie sesi
    const socket = io({ withCredentials: true });
    socket.on("sync_data", () => {
      refreshUnits();
      refreshBookings();
      refreshMembers();
      refreshTransactions();
      refreshSummary();
      refreshAddons();
    });

    socket.on("new_booking_notification", (data) => {
      const sourceStr = data.isWhatsapp ? "WhatsApp Bot" : "Sistem";
      setToast(`Booking baru (${sourceStr}): ${data.customerName} - ${data.unitName} (${data.date} jam ${data.time})`);
      setTimeout(() => setToast(null), 8000);
    });

    return () => {
      clearInterval(clock);
      clearInterval(poll);
      socket.disconnect();
    };
  }, [refreshUnits, refreshBookings, refreshMembers, refreshTransactions, refreshSummary, refreshAddons]);

  const handleStart = async (payload) => {
    await api.startSession(startModalUnit.id, payload);
    setStartModalUnit(null);
    refreshUnits();
    refreshAddons();
  };

  const handlePause = async (unit) => {
    await api.pauseSession(unit.id);
    refreshUnits();
  };

  const handleResume = async (unit) => {
    await api.resumeSession(unit.id);
    refreshUnits();
  };

  const handleSwitchUnit = async (sourceUnitId, targetUnitId) => {
    await api.switchUnit(sourceUnitId, targetUnitId);
    setSwitchModalUnit(null);
    refreshUnits();
  };

  const handleUpdateSessionAddons = async (selectedAddons) => {
    await api.updateSessionAddons(addonsModalUnit.id, selectedAddons);
    setAddonsModalUnit(null);
    refreshUnits();
    refreshAddons();
  };

  const handleStop = async (payload) => {
    const res = await api.stopSession(stopModalUnit.id, payload);
    setStopModalUnit(null);

    // Tampilkan struk cetak
    setReceiptData(res);

    refreshUnits();
    refreshTransactions();
    refreshSummary();
    refreshMembers();
  };

  const handleKantinSave = async (payload) => {
    if (payload.deleteId) {
      await api.deleteAddon(payload.deleteId);
    } else {
      await api.saveAddon(payload);
    }
    refreshAddons();
  };

  const handleAddBooking = async (payload) => {
    await api.addBooking(payload);
    setBookingModal(false);
    refreshBookings();
  };

  const handleCheckIn = async (bookingId, targetUnitId) => {
    const id = typeof bookingId === "object" ? bookingId?.id : bookingId;
    await api.checkInBooking(id, targetUnitId);
    refreshBookings();
    refreshUnits();
  };

  const handleAddMember = async (payload) => {
    await api.addMember(payload);
    setMemberModal(false);
    refreshMembers();
  };

  return (
    <div
      style={{
        background: C.bg,
        color: C.text,
        minHeight: "100vh",
      }}
    >
      <div className="flex min-h-screen">
        <Sidebar
          tab={tab}
          setTab={setTab}
          user={user}
          onLogout={onLogout}
          isMobile={isMobile}
          drawerOpen={drawerOpen}
          setDrawerOpen={setDrawerOpen}
        />

        <div className="flex-1 min-w-0 flex flex-col">
          <TopBar
            tab={tab}
            now={now}
            isMobile={isMobile}
            onOpenDrawer={() => setDrawerOpen(true)}
            theme={theme}
            onToggleTheme={onToggleTheme}
          />

          {toast && (
            <div
              style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.primary}` }}
              className="fixed top-4 right-4 left-4 sm:left-auto z-[60] sm:max-w-sm p-3.5 rounded-lg shadow-lg flex items-start gap-2.5"
            >
              <BellRing size={16} className="shrink-0 mt-0.5" style={{ color: C.primary }} />
              <span className="text-[13px] leading-snug flex-1" style={{ color: C.text }}>{toast}</span>
              <button
                onClick={() => setToast(null)}
                className="p-0.5 rounded hover:bg-[var(--c-inset)] transition-colors"
                style={{ color: C.textFaint }}
                aria-label="Tutup notifikasi"
              >
                <X size={15} />
              </button>
            </div>
          )}

          <main className="flex-1 p-3.5 sm:p-5 md:p-8 pb-28 md:pb-8 overflow-x-hidden">
            {tab === "dashboard" && (
              <DashboardTab
                units={units}
                membersCount={members.length}
                now={now}
                todayRevenue={summary?.todayRevenue || 0}
                todayCount={summary?.todayCount || 0}
                onGoToUnits={() => setTab("units")}
              />
            )}
            {tab === "units" && (
              <UnitsTab
                units={units}
                bookings={bookings}
                now={now}
                onStart={setStartModalUnit}
                onStop={setStopModalUnit}
                onPause={handlePause}
                onResume={handleResume}
                onSwitch={setSwitchModalUnit}
                onManageAddons={setAddonsModalUnit}
              />
            )}
            {tab === "kantin" && (
              <KantinTab
                addons={addons}
                onRefresh={handleKantinSave}
                isAdmin={user.role === "admin"}
              />
            )}
            {tab === "booking" && (
              <BookingTab
                units={units}
                bookings={bookings}
                onAdd={() => setBookingModal(true)}
                onCheckIn={handleCheckIn}
                onSwitchUnit={setSwitchModalUnit}
              />
            )}
            {tab === "riwayat" && <RiwayatTab transactions={transactions} />}
            {tab === "member" && <MemberTab members={members} onAdd={() => setMemberModal(true)} />}
            {tab === "laporan" && <LaporanTab summary={summary} />}
            {tab === "users" && user.role === "admin" && (
              <UsersTab currentUser={user} onLogout={onLogout} />
            )}
          </main>
        </div>
      </div>

      <BottomNav tab={tab} setTab={setTab} onOpenDrawer={() => setDrawerOpen(true)} />

      {startModalUnit && (
        <StartSessionModal
          unit={startModalUnit}
          members={members}
          addons={addons}
          onClose={() => setStartModalUnit(null)}
          onConfirm={handleStart}
        />
      )}
      {stopModalUnit && (
        <StopSessionModal
          unit={units.find((u) => u.id === stopModalUnit.id) || stopModalUnit}
          members={members}
          now={now}
          onClose={() => setStopModalUnit(null)}
          onConfirm={handleStop}
        />
      )}
      {switchModalUnit && (
        <SwitchUnitModal
          sourceUnit={switchModalUnit}
          availableUnits={units}
          onClose={() => setSwitchModalUnit(null)}
          onConfirm={handleSwitchUnit}
        />
      )}
      {addonsModalUnit && (
        <SessionAddonsModal
          unit={units.find((u) => u.id === addonsModalUnit.id) || addonsModalUnit}
          addons={addons}
          onClose={() => setAddonsModalUnit(null)}
          onConfirm={handleUpdateSessionAddons}
        />
      )}
      {receiptData && (
        <PrintReceiptModal receiptData={receiptData} onClose={() => setReceiptData(null)} />
      )}
      {bookingModal && (
        <AddBookingModal
          units={units}
          onClose={() => setBookingModal(false)}
          onSave={handleAddBooking}
        />
      )}
      {memberModal && (
        <AddMemberModal onClose={() => setMemberModal(false)} onSave={handleAddMember} />
      )}
    </div>
  );
}
