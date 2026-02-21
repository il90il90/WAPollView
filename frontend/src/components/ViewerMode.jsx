import { useState, useEffect, useCallback } from "react";
import Step4Dashboard from "./Step4Dashboard";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "";

export default function ViewerMode({ socket, isConnected, onBack }) {
  const [poll, setPoll] = useState(null);
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noPoll, setNoPoll] = useState(false);
  const [template, setTemplate] = useState("classic");

  const fetchViewerPoll = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/viewer-poll`);
      const data = await res.json();
      if (data.template) setTemplate(data.template);
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

  useEffect(() => {
    if (!socket) return;
    const handleChange = (data) => {
      if (data?.template) setTemplate(data.template);
      fetchViewerPoll();
    };
    const handleTemplateChange = (data) => {
      if (data?.template) setTemplate(data.template);
    };
    socket.on("viewer_poll_changed", handleChange);
    socket.on("viewer_template_changed", handleTemplateChange);
    return () => {
      socket.off("viewer_poll_changed", handleChange);
      socket.off("viewer_template_changed", handleTemplateChange);
    };
  }, [socket, fetchViewerPoll]);

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
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-800/80 border border-gray-700 hover:border-red-500/40 hover:bg-gray-800 text-gray-400 hover:text-red-400 text-xs font-medium transition-all"
              title="Logout"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="card p-10 text-center max-w-md w-full space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
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
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-wa-green animate-pulse" : "bg-red-500"}`} />
              <span className="text-gray-400 hidden sm:inline">Live</span>
            </span>
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-800/80 border border-gray-700 hover:border-red-500/40 hover:bg-gray-800 text-gray-400 hover:text-red-400 text-xs font-medium transition-all"
              title="Logout"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        <Step4Dashboard
          socket={socket}
          poll={poll}
          group={group}
          onBack={onBack}
          isViewer={true}
          viewerTemplate={template}
        />
      </main>
    </div>
  );
}
