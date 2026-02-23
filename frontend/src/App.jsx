import { useState, useEffect, useCallback } from "react";
import { useSocket } from "./hooks/useSocket";
import Step1Auth from "./components/Step1Auth";
import Step2Groups from "./components/Step2Groups";
import Step3CreatePoll from "./components/Step3CreatePoll";
import Step4Dashboard from "./components/Step4Dashboard";
import ModeSelect from "./components/ModeSelect";
import ViewerMode from "./components/ViewerMode";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "";

const STEPS = [
  { label: "Connect", icon: "🔗" },
  { label: "Select", icon: "📋" },
  { label: "Create", icon: "✏️" },
  { label: "Dashboard", icon: "📊" },
];

export default function App() {
  const { socket, isConnected } = useSocket();
  const [mode, setMode] = useState(() => localStorage.getItem("pollAppMode"));
  const [step, setStep] = useState(1);
  const [waStatus, setWaStatus] = useState("disconnected");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [cpCurrent, setCpCurrent] = useState("");
  const [cpNew, setCpNew] = useState("");
  const [cpConfirm, setCpConfirm] = useState("");
  const [cpError, setCpError] = useState("");
  const [cpSuccess, setCpSuccess] = useState("");
  const [cpLoading, setCpLoading] = useState(false);
  const [showWaLogout, setShowWaLogout] = useState(false);
  const [waLogoutLoading, setWaLogoutLoading] = useState(false);
  const [showDeletePolls, setShowDeletePolls] = useState(false);
  const [dpPassword, setDpPassword] = useState("");
  const [dpError, setDpError] = useState("");
  const [dpLoading, setDpLoading] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPw, setAdminPw] = useState("");
  const [adminPwConfirm, setAdminPwConfirm] = useState("");
  const [adminLoginError, setAdminLoginError] = useState("");
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);
  const [isAdminConfigured, setIsAdminConfigured] = useState(null);

  useEffect(() => {
    if (mode === "admin" && step === 1) {
      fetch(`${API_BASE}/api/connection-status`)
        .then((r) => r.json())
        .then((data) => {
          if (data.status === "connected") {
            setWaStatus("connected");
            setStep(2);
          }
        })
        .catch(() => {});
    }
  }, [mode]);

  useEffect(() => {
    if (!socket) return;

    const handleStatus = (data) => {
      setWaStatus(data.status);
      if (data.status === "connected" && step === 1 && mode === "admin") {
        setStep(2);
      }
    };

    socket.on("connection_status", handleStatus);
    socket.emit("request_connection_status");

    return () => {
      socket.off("connection_status", handleStatus);
    };
  }, [socket, step, mode]);

  const handleSetMode = useCallback((m) => {
    setMode(m);
    if (m) {
      localStorage.setItem("pollAppMode", m);
    } else {
      localStorage.removeItem("pollAppMode");
    }
  }, []);

  const handleLogout = useCallback(() => {
    handleSetMode("viewer");
    setStep(1);
    setSelectedGroup(null);
    setSelectedPoll(null);
  }, [handleSetMode]);

  const handleSelectExistingPoll = useCallback((group, poll) => {
    setSelectedGroup(group);
    setSelectedPoll(poll);
    setStep(4);
  }, []);

  const handleNewPoll = useCallback((group) => {
    setSelectedGroup(group);
    setSelectedPoll(null);
    setStep(3);
  }, []);

  const handlePollCreated = useCallback((poll) => {
    setSelectedPoll(poll);
    setStep(4);
  }, []);

  const handleBack = useCallback(() => {
    setStep((s) => Math.max(1, s - 1));
  }, []);

  const handleGoToStep = useCallback((s) => {
    setStep(s);
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setCpError("");
    setCpSuccess("");
    if (cpNew.length < 4) { setCpError("New password must be at least 4 characters"); return; }
    if (cpNew !== cpConfirm) { setCpError("Passwords don't match"); return; }
    setCpLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: cpCurrent, newPassword: cpNew }),
      });
      const data = await res.json();
      if (data.success) {
        setCpSuccess("Password changed successfully!");
        setCpCurrent(""); setCpNew(""); setCpConfirm("");
        setTimeout(() => setShowChangePassword(false), 1200);
      } else {
        setCpError(data.error || "Failed to change password");
      }
    } catch {
      setCpError("Connection error");
    } finally {
      setCpLoading(false);
    }
  };

  const handleDeletePolls = async (e) => {
    e.preventDefault();
    setDpError("");
    if (!dpPassword.trim()) return;
    setDpLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/delete-polls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: dpPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setShowDeletePolls(false);
        setDpPassword("");
        setStep(2);
        setSelectedGroup(null);
        setSelectedPoll(null);
      } else {
        setDpError(data.error || "Failed to delete polls");
      }
    } catch {
      setDpError("Connection error");
    } finally {
      setDpLoading(false);
    }
  };

  const handleAdminClick = useCallback(() => {
    setAdminPw("");
    setAdminPwConfirm("");
    setAdminLoginError("");
    fetch(`${API_BASE}/api/admin/setup-status`)
      .then((r) => r.json())
      .then((data) => {
        setIsAdminConfigured(data.isConfigured);
        setShowAdminLogin(true);
      })
      .catch(() => {
        setIsAdminConfigured(false);
        setShowAdminLogin(true);
      });
  }, []);

  const handleAdminLoginSubmit = async (e) => {
    e.preventDefault();
    setAdminLoginError("");
    if (isAdminConfigured === false) {
      if (adminPw.length < 4) { setAdminLoginError("Password must be at least 4 characters"); return; }
      if (adminPw !== adminPwConfirm) { setAdminLoginError("Passwords don't match"); return; }
      setAdminLoginLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/admin/setup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: adminPw }),
        });
        const data = await res.json();
        if (data.success) {
          setShowAdminLogin(false);
          handleSetMode("admin");
        } else {
          setAdminLoginError(data.error || "Setup failed");
        }
      } catch { setAdminLoginError("Connection error"); }
      finally { setAdminLoginLoading(false); }
    } else {
      if (!adminPw.trim()) return;
      setAdminLoginLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/admin/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: adminPw }),
        });
        const data = await res.json();
        if (data.success) {
          setShowAdminLogin(false);
          handleSetMode("admin");
        } else {
          setAdminLoginError("Wrong password");
          setAdminPw("");
        }
      } catch { setAdminLoginError("Connection error"); }
      finally { setAdminLoginLoading(false); }
    }
  };

  const handleWaLogout = async () => {
    setWaLogoutLoading(true);
    try {
      await fetch(`${API_BASE}/api/admin/wa-logout`, { method: "POST" });
      setShowWaLogout(false);
      setStep(1);
    } catch {
      // ignore
    } finally {
      setWaLogoutLoading(false);
    }
  };

  if (!mode || mode === "viewer") {
    return (
      <>
        <ViewerMode
          socket={socket}
          isConnected={isConnected}
          onAdminClick={handleAdminClick}
        />
        {showAdminLogin && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="card p-6 md:p-8 w-full max-w-sm space-y-5 animate-slide-up">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-wa-green/20 flex items-center justify-center">
                  <svg className="w-7 h-7 text-wa-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold">{isAdminConfigured === false ? "First Time Setup" : "Admin Login"}</h2>
                <p className="text-gray-500 text-xs">
                  {isAdminConfigured === false ? "Choose an admin password to get started" : "Enter the admin password to continue"}
                </p>
              </div>
              <form onSubmit={handleAdminLoginSubmit} className="space-y-3">
                <input type="password" placeholder={isAdminConfigured === false ? "Choose admin password" : "Password"} value={adminPw}
                  onChange={(e) => { setAdminPw(e.target.value); setAdminLoginError(""); }} autoFocus
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-center tracking-widest focus:outline-none focus:border-wa-green/50 focus:ring-1 focus:ring-wa-green/20 transition-all placeholder-gray-600" />
                {isAdminConfigured === false && (
                  <input type="password" placeholder="Confirm password" value={adminPwConfirm}
                    onChange={(e) => { setAdminPwConfirm(e.target.value); setAdminLoginError(""); }}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-center tracking-widest focus:outline-none focus:border-wa-green/50 focus:ring-1 focus:ring-wa-green/20 transition-all placeholder-gray-600" />
                )}
                {adminLoginError && <p className="text-red-400 text-xs text-center">{adminLoginError}</p>}
                <button type="submit" disabled={adminLoginLoading || !adminPw.trim()}
                  className="w-full btn-primary py-3 text-sm font-medium disabled:opacity-40">
                  {adminLoginLoading ? "Verifying..." : isAdminConfigured === false ? "Set Password & Enter" : "Enter"}
                </button>
              </form>
              <button onClick={() => setShowAdminLogin(false)}
                className="w-full text-center text-xs text-gray-500 hover:text-gray-300 transition-colors">Cancel</button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-50 bg-gray-950/90 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-300 transition-colors"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
            <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-wa-green to-emerald-400 bg-clip-text text-transparent">
              Admin Panel
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setShowDeletePolls(true); setDpPassword(""); setDpError(""); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-800/80 border border-gray-700 hover:border-blue-500/40 hover:bg-gray-800 text-gray-400 hover:text-blue-400 text-xs font-medium transition-all"
              title="Sync Polls"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden sm:inline">Sync</span>
            </button>
            <button
              onClick={() => setShowWaLogout(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-800/80 border border-gray-700 hover:border-red-500/40 hover:bg-gray-800 text-gray-400 hover:text-red-400 text-xs font-medium transition-all"
              title="Disconnect WhatsApp"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              <span className="hidden sm:inline">Disconnect</span>
            </button>
            <button
              onClick={() => { setShowChangePassword(true); setCpCurrent(""); setCpNew(""); setCpConfirm(""); setCpError(""); setCpSuccess(""); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-800/80 border border-gray-700 hover:border-amber-500/40 hover:bg-gray-800 text-gray-400 hover:text-amber-400 text-xs font-medium transition-all"
              title="Change Password"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <span className="hidden sm:inline">Password</span>
            </button>
            <div className="flex items-center gap-2 text-xs">
              <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-wa-green animate-pulse" : "bg-red-500"}`} />
              <span className="text-gray-400 hidden sm:inline">
                {isConnected ? "Socket connected" : "Socket offline"}
              </span>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 pb-3">
          <div className="flex items-center gap-1 md:gap-2">
            {STEPS.map((s, i) => {
              const stepNum = i + 1;
              const isActive = step === stepNum;
              const isDone = step > stepNum;
              return (
                <div key={s.label} className="flex items-center flex-1">
                  <button
                    onClick={() => isDone && handleGoToStep(stepNum)}
                    disabled={!isDone}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs md:text-sm font-medium transition-all w-full
                      ${isActive ? "bg-wa-green/20 text-wa-green border border-wa-green/30" : ""}
                      ${isDone ? "text-wa-green/70 cursor-pointer hover:bg-wa-green/10" : ""}
                      ${!isActive && !isDone ? "text-gray-600" : ""}
                    `}
                  >
                    <span className="text-base">{s.icon}</span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={`h-px w-4 md:w-8 mx-1 ${isDone ? "bg-wa-green/50" : "bg-gray-800"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        {step === 1 && <Step1Auth socket={socket} waStatus={waStatus} />}
        {step === 2 && (
          <Step2Groups socket={socket} onSelectPoll={handleSelectExistingPoll} onNewPoll={handleNewPoll} />
        )}
        {step === 3 && (
          <Step3CreatePoll group={selectedGroup} onPollCreated={handlePollCreated} onBack={handleBack} />
        )}
        {step === 4 && (
          <Step4Dashboard socket={socket} poll={selectedPoll} group={selectedGroup} onBack={() => setStep(2)} />
        )}
      </main>

      {showWaLogout && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card p-6 md:p-8 w-full max-w-sm space-y-5 animate-slide-up">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <h2 className="text-lg font-bold">Disconnect WhatsApp</h2>
              <p className="text-sm text-gray-400">Are you sure you want to disconnect from WhatsApp? You will need to scan the QR code or enter a pairing code again to reconnect.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowWaLogout(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-3 rounded-xl text-sm transition-all border border-gray-700"
              >
                No
              </button>
              <button
                onClick={handleWaLogout}
                disabled={waLogoutLoading}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-40 transition-all"
              >
                {waLogoutLoading ? "Disconnecting..." : "Yes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeletePolls && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card p-6 md:p-8 w-full max-w-sm space-y-5 animate-slide-up">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h2 className="text-lg font-bold">Sync Polls</h2>
              <p className="text-sm text-gray-400">This will delete all existing polls and re-sync them from WhatsApp. Votes and history will be refreshed.</p>
            </div>

            <form onSubmit={handleDeletePolls} className="space-y-3">
              <input type="password" placeholder="Enter admin password to confirm" value={dpPassword}
                onChange={(e) => { setDpPassword(e.target.value); setDpError(""); }} autoFocus
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-center tracking-widest focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all placeholder-gray-600" />
              {dpError && <p className="text-red-400 text-xs text-center">{dpError}</p>}
              <button type="submit" disabled={dpLoading || !dpPassword.trim()}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-40 transition-all">
                {dpLoading ? "Syncing..." : "Sync All Polls"}
              </button>
            </form>

            <button onClick={() => setShowDeletePolls(false)}
              className="w-full text-center text-xs text-gray-500 hover:text-gray-300 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {showChangePassword && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card p-6 md:p-8 w-full max-w-sm space-y-5 animate-slide-up">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold">Change Admin Password</h2>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3">
              <input type="password" placeholder="Current password" value={cpCurrent}
                onChange={(e) => { setCpCurrent(e.target.value); setCpError(""); setCpSuccess(""); }} autoFocus
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-center tracking-widest focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all placeholder-gray-600" />
              <input type="password" placeholder="New password" value={cpNew}
                onChange={(e) => { setCpNew(e.target.value); setCpError(""); setCpSuccess(""); }}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-center tracking-widest focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all placeholder-gray-600" />
              <input type="password" placeholder="Confirm new password" value={cpConfirm}
                onChange={(e) => { setCpConfirm(e.target.value); setCpError(""); setCpSuccess(""); }}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-center tracking-widest focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all placeholder-gray-600" />
              {cpError && <p className="text-red-400 text-xs text-center">{cpError}</p>}
              {cpSuccess && <p className="text-green-400 text-xs text-center">{cpSuccess}</p>}
              <button type="submit" disabled={cpLoading || !cpCurrent.trim() || !cpNew.trim() || !cpConfirm.trim()}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3 rounded-xl text-sm disabled:opacity-40 transition-all">
                {cpLoading ? "Changing..." : "Change Password"}
              </button>
            </form>

            <button onClick={() => setShowChangePassword(false)}
              className="w-full text-center text-xs text-gray-500 hover:text-gray-300 transition-colors">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
