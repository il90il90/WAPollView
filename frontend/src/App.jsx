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

  useEffect(() => {
    if (!socket) return;

    const handleStatus = (data) => {
      setWaStatus(data.status);
      if (data.status === "connected" && step === 1 && mode === "admin") {
        setTimeout(() => setStep(2), 800);
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
    handleSetMode(null);
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

  if (!mode) {
    return <ModeSelect onSelect={handleSetMode} isConnected={isConnected} />;
  }

  if (mode === "viewer") {
    return (
      <ViewerMode
        socket={socket}
        isConnected={isConnected}
        onBack={handleLogout}
      />
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
