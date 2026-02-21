import { useState, useEffect, useCallback } from "react";
import { useSocket } from "./hooks/useSocket";
import Step1Auth from "./components/Step1Auth";
import Step2Groups from "./components/Step2Groups";
import Step3CreatePoll from "./components/Step3CreatePoll";
import Step4Dashboard from "./components/Step4Dashboard";
import ModeSelect from "./components/ModeSelect";
import ViewerMode from "./components/ViewerMode";

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
          <div className="flex items-center gap-2 text-xs">
            <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-wa-green animate-pulse" : "bg-red-500"}`} />
            <span className="text-gray-400 hidden sm:inline">
              {isConnected ? "Socket connected" : "Socket offline"}
            </span>
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
    </div>
  );
}
