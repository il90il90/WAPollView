import { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "";

export default function ModeSelect({ onSelect, isConnected }) {
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(null);
  const [checkingSetup, setCheckingSetup] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/admin/setup-status`);
        const data = await res.json();
        setIsConfigured(data.isConfigured);
      } catch {
        setIsConfigured(false);
      } finally {
        setCheckingSetup(false);
      }
    })();
  }, []);

  const handleFirstTimeSetup = async (e) => {
    e.preventDefault();
    if (!password.trim() || password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        setIsConfigured(true);
        onSelect("admin");
      } else {
        setError(data.error || "Setup failed");
      }
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        onSelect("admin");
      } else {
        setError("Wrong password");
        setPassword("");
      }
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-wa-green/30 border-t-wa-green rounded-full animate-spin" />
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="card p-6 md:p-8 w-full max-w-sm space-y-5 animate-slide-up">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-wa-green/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-wa-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-wa-green to-emerald-400 bg-clip-text text-transparent">
              WAPollView
            </h1>
            <h2 className="text-lg font-bold text-white">First Time Setup</h2>
            <p className="text-gray-400 text-xs">Choose an admin password to get started</p>
          </div>

          <form onSubmit={handleFirstTimeSetup} className="space-y-3">
            <input
              type="password"
              placeholder="Choose admin password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              autoFocus
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3
                         text-sm text-center tracking-widest focus:outline-none focus:border-wa-green/50
                         focus:ring-1 focus:ring-wa-green/20 transition-all placeholder-gray-600"
            />
            <input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3
                         text-sm text-center tracking-widest focus:outline-none focus:border-wa-green/50
                         focus:ring-1 focus:ring-wa-green/20 transition-all placeholder-gray-600"
            />
            {error && <p className="text-red-400 text-xs text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading || !password.trim() || !confirmPassword.trim()}
              className="w-full btn-primary py-3 text-sm font-medium disabled:opacity-40"
            >
              {loading ? "Setting up..." : "Set Password & Enter"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-gray-950/90 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-wa-green animate-pulse" : "bg-red-500"}`} />
            <span className="text-gray-500">{isConnected ? "Server connected" : "Connecting..."}</span>
          </div>
          <button
            onClick={() => { setShowLogin(true); setPassword(""); setError(""); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/80 border border-gray-700 hover:border-wa-green/40 hover:bg-gray-800 text-gray-400 hover:text-wa-green text-xs font-medium transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Admin
          </button>
        </div>
      </header>

      {showLogin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card p-6 md:p-8 w-full max-w-sm space-y-5 animate-slide-up">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-wa-green/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-wa-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold">Admin Login</h2>
              <p className="text-gray-500 text-xs">Enter the admin password to continue</p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-3">
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                autoFocus
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3
                           text-sm text-center tracking-widest focus:outline-none focus:border-wa-green/50
                           focus:ring-1 focus:ring-wa-green/20 transition-all placeholder-gray-600"
              />
              {error && <p className="text-red-400 text-xs text-center">{error}</p>}
              <button
                type="submit"
                disabled={loading || !password.trim()}
                className="w-full btn-primary py-3 text-sm font-medium disabled:opacity-40"
              >
                {loading ? "Verifying..." : "Enter"}
              </button>
            </form>

            <button
              onClick={() => { setShowLogin(false); setPassword(""); setError(""); }}
              className="w-full text-center text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="text-center mb-10 space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-wa-green to-emerald-400 bg-clip-text text-transparent">
            WAPollView
          </h1>
          <p className="text-gray-400 text-sm md:text-base">Real-time polling analytics platform</p>
        </div>

        <button
          onClick={() => onSelect("viewer")}
          className="card p-8 md:p-10 text-center hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group cursor-pointer w-full max-w-md"
        >
          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
            <svg className="w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Enter as Viewer</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Browse polls and view live results with voter details and analytics
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {["View", "Analytics", "Live"].map((t) => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400/70">{t}</span>
            ))}
          </div>
        </button>
      </div>
    </div>
  );
}
