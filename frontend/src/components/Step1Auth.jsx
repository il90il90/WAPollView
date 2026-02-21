import { useState, useEffect } from "react";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "";

export default function Step1Auth({ socket, waStatus }) {
  const [qrCode, setQrCode] = useState(null);
  const [authMode, setAuthMode] = useState("qr");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pairingCode, setPairingCode] = useState(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [pairingError, setPairingError] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const handleQR = (data) => {
      setQrCode(data.qr);
    };

    const handlePairingResponse = (data) => {
      setPairingLoading(false);
      if (data.success) {
        setPairingCode(data.code);
        setPairingError(null);
      } else {
        setPairingError(data.error || "Failed to generate pairing code");
        setPairingCode(null);
      }
    };

    const handleStatus = (data) => {
      if (data.status === "reconnecting" || data.status === "logged_out") {
        setPairingCode(null);
        setPairingError(null);
        setPairingLoading(false);
      }
    };

    socket.on("qr_code_update", handleQR);
    socket.on("pairing_code_response", handlePairingResponse);
    socket.on("connection_status", handleStatus);

    return () => {
      socket.off("qr_code_update", handleQR);
      socket.off("pairing_code_response", handlePairingResponse);
      socket.off("connection_status", handleStatus);
    };
  }, [socket]);

  const handleRequestPairingCode = async () => {
    if (!phoneNumber.trim() || pairingLoading) return;
    setPairingLoading(true);
    setPairingError(null);
    setPairingCode(null);

    try {
      const res = await fetch(`${API_BASE}/api/pairing-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
      });
      const data = await res.json();
      setPairingLoading(false);
      if (data.success) {
        setPairingCode(data.code);
      } else {
        setPairingError(data.error || "Failed to generate code");
      }
    } catch (err) {
      setPairingLoading(false);
      setPairingError("Connection error. Please try again.");
    }
  };

  const formatPairingCode = (code) => {
    if (!code) return "";
    const clean = code.replace(/[^A-Za-z0-9]/g, "");
    if (clean.length <= 4) return clean;
    return clean.slice(0, 4) + "-" + clean.slice(4);
  };

  const statusLabel = {
    disconnected: "Initializing connection...",
    waiting_for_qr: "Ready to connect",
    connecting: "Authenticating...",
    connected: "Connected successfully!",
    reconnecting: "Reconnecting...",
    logged_out: "Session expired, reconnecting...",
  };

  const isConnected = waStatus === "connected";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="card p-6 md:p-10 max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <div className="text-5xl mb-3">
            {isConnected ? "✅" : "📱"}
          </div>
          <h2 className="text-2xl font-bold">
            {isConnected ? "Connected!" : "Link WhatsApp"}
          </h2>
          <p className="text-gray-400 text-sm">
            {statusLabel[waStatus] || "Waiting..."}
          </p>
        </div>

        {isConnected && (
          <div className="space-y-3">
            <div className="w-16 h-16 mx-auto bg-wa-green/20 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-wa-green"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">
              Syncing your groups and polls...
            </p>
          </div>
        )}

        {!isConnected && (
          <>
            <div className="flex bg-gray-800 rounded-xl p-1 gap-1">
              <button
                onClick={() => setAuthMode("qr")}
                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                  authMode === "qr"
                    ? "bg-wa-green/20 text-wa-green shadow-sm"
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                QR Code
              </button>
              <button
                onClick={() => setAuthMode("phone")}
                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                  authMode === "phone"
                    ? "bg-wa-green/20 text-wa-green shadow-sm"
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                Phone Number
              </button>
            </div>

            {authMode === "qr" && (
              <div className="space-y-4">
                {qrCode ? (
                  <div className="flex justify-center">
                    <div className="bg-white p-4 rounded-2xl shadow-2xl shadow-wa-green/10">
                      <img
                        src={qrCode}
                        alt="WhatsApp QR Code"
                        className="w-56 h-56 md:w-64 md:h-64"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <div className="w-12 h-12 border-4 border-wa-green/30 border-t-wa-green rounded-full animate-spin" />
                    <p className="text-gray-500 text-sm">Generating QR code...</p>
                  </div>
                )}
                <div className="text-xs text-gray-600 space-y-1">
                  <p>1. Open WhatsApp on your phone</p>
                  <p>2. Go to Settings → Linked Devices</p>
                  <p>3. Tap "Link a Device" and scan this code</p>
                </div>
              </div>
            )}

            {authMode === "phone" && (
              <div className="space-y-4">
                <div className="space-y-2 text-left">
                  <label className="block text-sm font-medium text-gray-300">
                    Phone Number
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">+</span>
                    <input
                      type="tel"
                      placeholder="972501234567"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ""))}
                      maxLength={15}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 pl-7
                                 text-sm focus:outline-none focus:border-wa-green/50 focus:ring-1 focus:ring-wa-green/20
                                 transition-all placeholder-gray-600"
                      onKeyDown={(e) => e.key === "Enter" && handleRequestPairingCode()}
                    />
                  </div>
                  <p className="text-xs text-gray-600">
                    Enter with country code, no spaces or dashes
                  </p>
                </div>

                <button
                  onClick={handleRequestPairingCode}
                  disabled={!phoneNumber.trim() || phoneNumber.length < 10 || pairingLoading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {pairingLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Get Pairing Code"
                  )}
                </button>

                {pairingCode && (
                  <div className="bg-wa-green/10 border border-wa-green/30 rounded-xl p-5 space-y-3">
                    <p className="text-sm text-gray-300">Your pairing code:</p>
                    <p className="text-4xl font-mono font-bold tracking-[0.3em] text-wa-green">
                      {formatPairingCode(pairingCode)}
                    </p>
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>1. Open WhatsApp on your phone</p>
                      <p>2. Go to Settings → Linked Devices</p>
                      <p>3. Tap "Link a Device" → "Link with phone number instead"</p>
                      <p>4. Enter this code</p>
                    </div>
                  </div>
                )}

                {pairingError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400">
                    {pairingError}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
