import { useState, useEffect, useCallback, useRef } from "react";
import Step4Dashboard from "./Step4Dashboard";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "";

export default function ViewerMode({ socket, isConnected, onBack, onAdminClick }) {
  const [poll, setPoll] = useState(null);
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noPoll, setNoPoll] = useState(false);
  const [template, setTemplate] = useState("classic");
  const [effect, setEffect] = useState("confetti");
  const [profileImage, setProfileImage] = useState(null);
  const [displayName, setDisplayName] = useState(null);

  // Web voting state
  const [webVotingEnabled, setWebVotingEnabled] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [voterSession, setVoterSession] = useState(() => {
    try {
      const saved = localStorage.getItem("webVoterSession");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [submittingVote, setSubmittingVote] = useState(false);
  const [voteSuccess, setVoteSuccess] = useState(false);
  const [currentVote, setCurrentVote] = useState(null);
  const [votes, setVotes] = useState([]);
  const [nameRequired, setNameRequired] = useState(false);
  const [pendingSession, setPendingSession] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [nameSubmitting, setNameSubmitting] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutPassword, setLogoutPassword] = useState("");
  const [logoutError, setLogoutError] = useState("");
  const [logoutLoading, setLogoutLoading] = useState(false);
  const fpRef = useRef(null);

  const fetchViewerPoll = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/viewer-poll`);
      const data = await res.json();
      if (data.template) setTemplate(data.template);
      if (data.effect) setEffect(data.effect);
      if (data.profileImage !== undefined) setProfileImage(data.profileImage);
      if (data.displayName !== undefined) setDisplayName(data.displayName);
      if (data.poll) {
        setPoll(data.poll);
        setGroup(data.group);
        setNoPoll(false);
      } else {
        setPoll(null);
        setGroup(null);
        setNoPoll(true);
      }
    } catch (err) {
      console.error("Failed to fetch viewer poll:", err);
      setNoPoll(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchViewerPoll();
  }, [fetchViewerPoll]);

  // Fetch web voting settings
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/web-vote/settings`);
        const data = await res.json();
        setWebVotingEnabled(data.enabled || false);
      } catch {}
    })();
  }, []);

  // Initialize FingerprintJS lazily
  const getFingerprint = useCallback(async () => {
    if (!fpRef.current) {
      const FingerprintJS = await import("@fingerprintjs/fingerprintjs");
      fpRef.current = await FingerprintJS.load();
    }
    return fpRef.current.get();
  }, []);

  // Validate existing session on load
  useEffect(() => {
    if (!voterSession?.sessionId) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/web-vote/session/${voterSession.sessionId}`);
        const data = await res.json();
        if (!data.valid) {
          localStorage.removeItem("webVoterSession");
          setVoterSession(null);
        }
      } catch {
        localStorage.removeItem("webVoterSession");
        setVoterSession(null);
      }
    })();
  }, [voterSession?.sessionId]);

  // Fetch current vote for this voter when poll loads
  useEffect(() => {
    if (!poll?.id || !voterSession) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/polls/${poll.id}/votes`);
        const data = await res.json();
        setVotes(data.options || data || []);
        const voterJid = voterSession.phone + "@s.whatsapp.net";
        const allOptions = data.options || data || [];
        const votedFor = [];
        for (const opt of allOptions) {
          if (opt.voters?.some(v => v.jid === voterJid)) {
            votedFor.push(opt.optionId);
          }
        }
        if (votedFor.length > 0) {
          setCurrentVote(votedFor);
          setSelectedOptions(votedFor);
        }
      } catch {}
    })();
  }, [poll?.id, voterSession]);

  // Listen for web voting settings changes
  useEffect(() => {
    if (!socket) return;
    const handleSettingsChange = (data) => {
      setWebVotingEnabled(data?.enabled || false);
    };
    socket.on("web_voting_settings_changed", handleSettingsChange);
    return () => socket.off("web_voting_settings_changed", handleSettingsChange);
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    const handleReconnect = () => fetchViewerPoll();
    const handleChange = (data) => {
      if (data?.template) setTemplate(data.template);
      if (data?.effect) setEffect(data.effect);
      fetchViewerPoll();
    };
    const handleTemplateChange = (data) => {
      if (data?.template) setTemplate(data.template);
    };
    const handleEffectChange = (data) => {
      if (data?.effect) setEffect(data.effect);
    };
    const handleProfileImageChange = (data) => {
      setProfileImage(data?.profileImage || null);
    };
    const handleDisplayNameChange = (data) => {
      setDisplayName(data?.displayName || null);
    };
    socket.on("connect", handleReconnect);
    socket.on("viewer_poll_changed", handleChange);
    socket.on("viewer_template_changed", handleTemplateChange);
    socket.on("viewer_effect_changed", handleEffectChange);
    socket.on("viewer_profile_image_changed", handleProfileImageChange);
    socket.on("viewer_display_name_changed", handleDisplayNameChange);
    return () => {
      socket.off("connect", handleReconnect);
      socket.off("viewer_poll_changed", handleChange);
      socket.off("viewer_template_changed", handleTemplateChange);
      socket.off("viewer_effect_changed", handleEffectChange);
      socket.off("viewer_profile_image_changed", handleProfileImageChange);
      socket.off("viewer_display_name_changed", handleDisplayNameChange);
    };
  }, [socket, fetchViewerPoll]);

  // Listen for vote updates to refresh current vote state
  useEffect(() => {
    if (!socket || !poll?.id || !voterSession) return;
    const handleVoteReceived = (data) => {
      if (data.pollId !== poll.id) return;
      const allOptions = data.votes?.options || data.votes || [];
      setVotes(allOptions);
    };
    socket.on("poll_vote_received", handleVoteReceived);
    return () => socket.off("poll_vote_received", handleVoteReceived);
  }, [socket, poll?.id, voterSession]);

  const handleVerifyPhone = async (e) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return;
    setVerifying(true);
    setVerifyError("");
    try {
      const fp = await getFingerprint();
      const res = await fetch(`${API_BASE}/api/web-vote/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phoneNumber.replace(/[^0-9]/g, ""),
          fingerprintId: fp.visitorId,
          fingerprintData: fp.components,
        }),
      });
      const data = await res.json();
      if (data.verified) {
        if (data.nameRequired) {
          setPendingSession({ sessionId: data.sessionId, phone: data.phone });
          setNameRequired(true);
        } else {
          const session = { sessionId: data.sessionId, name: data.name, phone: data.phone };
          localStorage.setItem("webVoterSession", JSON.stringify(session));
          setVoterSession(session);
          setShowPhoneModal(false);
          setPhoneNumber("");
        }
      } else {
        setVerifyError(data.error || "Verification failed");
      }
    } catch (err) {
      setVerifyError("Connection error. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleNameSubmit = async (e) => {
    e.preventDefault();
    if (!nameInput.trim() || !pendingSession) return;
    setNameSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/web-vote/update-name`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: pendingSession.sessionId, name: nameInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        const session = { sessionId: pendingSession.sessionId, name: data.name, phone: pendingSession.phone };
        localStorage.setItem("webVoterSession", JSON.stringify(session));
        setVoterSession(session);
        setShowPhoneModal(false);
        setPhoneNumber("");
        setNameRequired(false);
        setPendingSession(null);
        setNameInput("");
      }
    } catch (err) {
      console.error("Failed to update name:", err);
    } finally {
      setNameSubmitting(false);
    }
  };

  const handleOptionToggle = (optionId) => {
    if (poll?.isLocked) return;
    const maxSelect = poll?.selectableCount || 1;
    setSelectedOptions((prev) => {
      if (prev.includes(optionId)) {
        return prev.filter((id) => id !== optionId);
      }
      if (maxSelect === 1) return [optionId];
      if (prev.length >= maxSelect) return prev;
      return [...prev, optionId];
    });
  };

  const handleSubmitVote = async () => {
    if (!voterSession?.sessionId || !poll?.id || selectedOptions.length === 0) return;
    setSubmittingVote(true);
    try {
      const res = await fetch(`${API_BASE}/api/web-vote/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: voterSession.sessionId,
          pollId: poll.id,
          selectedOptions,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentVote([...selectedOptions]);
        setVoteSuccess(true);
        setTimeout(() => setVoteSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to submit vote:", err);
    } finally {
      setSubmittingVote(false);
    }
  };

  const handleLogoutSession = () => {
    setShowLogoutModal(true);
    setLogoutPassword("");
    setLogoutError("");
  };

  const handleLogoutConfirm = async (e) => {
    e.preventDefault();
    if (!logoutPassword.trim()) return;
    setLogoutLoading(true);
    setLogoutError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: logoutPassword }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.removeItem("webVoterSession");
        setVoterSession(null);
        setSelectedOptions([]);
        setCurrentVote(null);
        setShowLogoutModal(false);
      } else {
        setLogoutError(data.error || "Wrong password");
      }
    } catch {
      setLogoutError("Connection error");
    } finally {
      setLogoutLoading(false);
    }
  };

  const hasVoteChanged = (() => {
    if (!currentVote) return selectedOptions.length > 0;
    if (currentVote.length !== selectedOptions.length) return true;
    return !currentVote.every((id) => selectedOptions.includes(id));
  })();

  const adminButton = (
    <button
      onClick={onAdminClick || onBack}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/80 border border-gray-700 hover:border-wa-green/40 hover:bg-gray-800 text-gray-400 hover:text-wa-green text-xs font-medium transition-all"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      Admin
    </button>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Loading poll...</p>
      </div>
    );
  }

  if (noPoll) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-50 bg-gray-950/90 backdrop-blur-md border-b border-gray-800">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Poll Viewer
              </h1>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-wa-green animate-pulse" : "bg-red-500"}`} />
                <span className="text-gray-400 hidden sm:inline">
                  {isConnected ? "Connected" : "Offline"}
                </span>
              </span>
              {adminButton}
            </div>
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="card p-10 text-center max-w-md w-full space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-300">No Active Poll</h2>
            <p className="text-sm text-gray-500">
              The admin hasn't shared a poll yet. This screen will update automatically when a poll is shared.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-600">
              <div className="w-2 h-2 rounded-full bg-blue-500/50 animate-pulse" />
              Waiting for admin...
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-gray-950/90 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Poll Viewer
            </h1>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {webVotingEnabled && voterSession && (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-300">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {voterSession.name}
                </span>
                <button
                  onClick={handleLogoutSession}
                  className="p-1 rounded hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors"
                  title="Sign out"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            )}
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-wa-green animate-pulse" : "bg-red-500"}`} />
              <span className="text-gray-400 hidden sm:inline">Live</span>
            </span>
            {adminButton}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        {(!webVotingEnabled || currentVote) && (
          <Step4Dashboard
            socket={socket}
            poll={poll}
            group={group}
            onBack={onBack}
            isViewer={true}
            viewerTemplate={template}
            viewerEffect={effect}
            viewerProfileImage={profileImage}
            viewerDisplayName={displayName}
          />
        )}

        {/* Web Voting Panel */}
        {webVotingEnabled && poll && !poll.isLocked && (
          <div className={currentVote ? "mt-6" : ""}>
            {!voterSession ? (
              <div className="card p-6 text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-500/20 flex items-center justify-center">
                  <svg className="w-7 h-7 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-200">Vote from your browser</h3>
                  <p className="text-sm text-gray-500 mt-1">Verify your phone number to cast your vote</p>
                  <p className="text-xs text-gray-600 mt-1">Poll results will be visible after you vote</p>
                </div>
                <button
                  onClick={() => { setShowPhoneModal(true); setPhoneNumber(""); setVerifyError(""); }}
                  className="px-6 py-3 rounded-xl text-sm font-bold bg-orange-500 text-white hover:bg-orange-400 transition-all shadow-lg shadow-orange-500/30"
                >
                  Verify & Vote
                </button>
              </div>
            ) : (
              <div className="card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center text-sm font-bold text-orange-400">
                      {voterSession.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-200">{voterSession.name}</p>
                      <p className="text-[11px] text-gray-500">+{voterSession.phone}</p>
                    </div>
                  </div>
                  {voteSuccess && (
                    <span className="text-xs px-3 py-1 rounded-full bg-green-500/20 text-green-400 font-bold animate-pulse">
                      Vote submitted!
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-gray-400 font-medium">
                    {poll.selectableCount === 1 ? "Select one option:" : `Select up to ${poll.selectableCount === 0 ? "any number of" : poll.selectableCount} options:`}
                  </p>
                  {poll.options?.map((opt) => {
                    const isSelected = selectedOptions.includes(opt.id);
                    const isCurrentVote = currentVote?.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleOptionToggle(opt.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "bg-orange-500/15 border-orange-500/50 text-orange-200"
                            : "bg-gray-800/50 border-gray-700 text-gray-300 hover:border-gray-500 hover:bg-gray-800"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          isSelected ? "border-orange-400 bg-orange-500" : "border-gray-600"
                        }`}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm font-medium flex-1">{opt.optionText}</span>
                        {isCurrentVote && !isSelected && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">previous</span>
                        )}
                        {isCurrentVote && isSelected && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400">current</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={handleSubmitVote}
                  disabled={submittingVote || selectedOptions.length === 0 || !hasVoteChanged}
                  className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-orange-500 text-white hover:bg-orange-400 shadow-lg shadow-orange-500/20"
                >
                  {submittingVote ? "Submitting..." : currentVote ? "Change Vote" : "Submit Vote"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Locked poll message for web voters */}
        {webVotingEnabled && poll?.isLocked && voterSession && (
          <div className="mt-6 card p-4 text-center">
            <p className="text-sm text-gray-400">This poll is locked. Voting is no longer available.</p>
          </div>
        )}
      </main>

      {/* Phone Verification Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card p-6 md:p-8 w-full max-w-sm space-y-5 animate-slide-up">
            {!nameRequired ? (
              <>
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-500/20 flex items-center justify-center">
                    <svg className="w-7 h-7 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold">Verify Your Phone</h2>
                  <p className="text-gray-500 text-xs">
                    Enter your phone number to verify your identity
                  </p>
                </div>
                <form onSubmit={handleVerifyPhone} className="space-y-3">
                  <div>
                    <input
                      type="tel"
                      placeholder="e.g. 972501234567 or 0501234567"
                      value={phoneNumber}
                      onChange={(e) => { setPhoneNumber(e.target.value); setVerifyError(""); }}
                      autoFocus
                      className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-center tracking-widest focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all placeholder-gray-600"
                    />
                    <p className="text-[10px] text-gray-600 mt-1.5 text-center">With or without country code</p>
                  </div>
                  {verifyError && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                      <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-red-400 text-xs">{verifyError}</p>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={verifying || !phoneNumber.trim()}
                    className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-40 transition-all"
                  >
                    {verifying ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Verifying...
                      </span>
                    ) : "Verify"}
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-green-500/20 flex items-center justify-center">
                    <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold">Phone Verified!</h2>
                  <p className="text-gray-500 text-xs">
                    Please enter your full name
                  </p>
                </div>
                <form onSubmit={handleNameSubmit} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Your full name"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    autoFocus
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-center focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all placeholder-gray-600"
                  />
                  <button
                    type="submit"
                    disabled={nameSubmitting || !nameInput.trim()}
                    className="w-full bg-green-500 hover:bg-green-400 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-40 transition-all"
                  >
                    {nameSubmitting ? "Saving..." : "Continue"}
                  </button>
                </form>
              </>
            )}
            <button
              onClick={() => { setShowPhoneModal(false); setNameRequired(false); setPendingSession(null); setNameInput(""); }}
              className="w-full text-center text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card p-6 md:p-8 w-full max-w-sm space-y-5 animate-slide-up">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold">Sign Out</h2>
              <p className="text-gray-500 text-xs">
                Enter admin password to sign out
              </p>
            </div>
            <form onSubmit={handleLogoutConfirm} className="space-y-3">
              <input
                type="password"
                placeholder="Admin password"
                value={logoutPassword}
                onChange={(e) => { setLogoutPassword(e.target.value); setLogoutError(""); }}
                autoFocus
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-center focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all placeholder-gray-600"
              />
              {logoutError && (
                <p className="text-red-400 text-xs text-center">{logoutError}</p>
              )}
              <button
                type="submit"
                disabled={logoutLoading || !logoutPassword.trim()}
                className="w-full bg-red-500 hover:bg-red-400 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-40 transition-all"
              >
                {logoutLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Verifying...
                  </span>
                ) : "Sign Out"}
              </button>
            </form>
            <button
              onClick={() => setShowLogoutModal(false)}
              className="w-full text-center text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
