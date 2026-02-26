import { useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "";

export default function Step2Groups({ socket, onSelectPoll, onNewPoll, onNewWebPoll }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [filter, setFilter] = useState("all");
  const [sharedPollId, setSharedPollId] = useState(null);
  const [sharedPollData, setSharedPollData] = useState(null);
  const [deletingPollId, setDeletingPollId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const fetchSharedPoll = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/viewer-poll`);
      const data = await res.json();
      setSharedPollId(data.poll?.id || null);
      setSharedPollData(data.poll ? { poll: data.poll, group: data.group } : null);
    } catch {
      setSharedPollId(null);
      setSharedPollData(null);
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/groups`);
      const data = await res.json();
      setGroups(data);
    } catch (err) {
      console.error("Failed to fetch groups:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
    fetchSharedPoll();
  }, [fetchGroups, fetchSharedPoll]);

  useEffect(() => {
    if (!socket) return;

    const refresh = () => fetchGroups();
    const refreshShared = () => fetchSharedPoll();
    socket.on("history_sync_complete", refresh);
    socket.on("groups_updated", refresh);
    socket.on("viewer_poll_changed", refreshShared);
    socket.on("poll_deleted", refresh);

    return () => {
      socket.off("history_sync_complete", refresh);
      socket.off("groups_updated", refresh);
      socket.off("viewer_poll_changed", refreshShared);
      socket.off("poll_deleted", refresh);
    };
  }, [socket, fetchGroups, fetchSharedPoll]);

  const webPolls = groups.flatMap((g) =>
    g.polls.filter((p) => p.source === "web").map((p) => ({ ...p, group: g }))
  );

  const handleDeletePoll = async (pollId) => {
    setDeletingPollId(pollId);
    try {
      const res = await fetch(`${API_BASE}/api/polls/${pollId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchGroups();
        fetchSharedPoll();
      }
    } catch (err) {
      console.error("Failed to delete poll:", err);
    } finally {
      setDeletingPollId(null);
      setConfirmDeleteId(null);
    }
  };

  const filtered = groups.filter((g) => {
    if (g.jid === "web-polls@virtual") return false;
    if (filter === "web_polls") return false;

    const matchesSearch =
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.jid.toLowerCase().includes(search.toLowerCase());

    if (filter === "with_polls") return matchesSearch && g.polls.length > 0;
    if (filter === "no_polls") return matchesSearch && g.polls.length === 0;
    return matchesSearch;
  });

  const totalPolls = groups.reduce((sum, g) => sum + g.polls.length, 0);

  if (loading && groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="w-10 h-10 border-4 border-wa-green/30 border-t-wa-green rounded-full animate-spin" />
        <p className="text-gray-400">Loading groups...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Your Groups</h2>
          <p className="text-gray-400 text-sm">
            {groups.length} groups · {totalPolls} polls
          </p>
        </div>
        <button
          onClick={fetchGroups}
          className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Active poll shortcut */}
      {sharedPollData && (
        <button
          onClick={() => onSelectPoll(sharedPollData.group, sharedPollData.poll)}
          className="w-full flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/30 hover:border-red-500/60 hover:from-red-500/15 hover:to-orange-500/15 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center text-xl shrink-0 group-hover:bg-red-500/30 transition-colors">
            📡
          </div>
          <div className="text-left min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-white group-hover:text-red-400 transition-colors truncate">
                {sharedPollData.poll.title}
              </p>
              <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                On Air
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {sharedPollData.group?.name || "Unknown group"} · {sharedPollData.poll.options?.length || 0} options
            </p>
          </div>
          <svg
            className="w-5 h-5 text-gray-500 group-hover:text-red-400 shrink-0 transition-colors"
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search groups by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 pl-10
                     text-sm focus:outline-none focus:border-wa-green/50 focus:ring-1 focus:ring-wa-green/20
                     transition-all placeholder-gray-600"
        />
        <svg
          className="absolute left-3 top-3.5 w-4 h-4 text-gray-600"
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-3 text-gray-500 hover:text-gray-300"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: `All (${groups.filter((g) => g.jid !== "web-polls@virtual").length})` },
          { key: "with_polls", label: `With Polls (${groups.filter((g) => g.jid !== "web-polls@virtual" && g.polls.length > 0).length})` },
          { key: "no_polls", label: `No Polls (${groups.filter((g) => g.jid !== "web-polls@virtual" && g.polls.length === 0).length})` },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
              filter === f.key
                ? "bg-wa-green/20 text-wa-green border border-wa-green/30"
                : "bg-gray-800 text-gray-400 hover:text-gray-300"
            }`}
          >
            {f.label}
          </button>
        ))}
        <button
          onClick={() => setFilter("web_polls")}
          className={`text-xs px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
            filter === "web_polls"
              ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
              : "bg-gray-800 text-gray-400 hover:text-gray-300"
          }`}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
          Web Polls ({webPolls.length})
        </button>
      </div>

      {/* Results count */}
      {search && (
        <p className="text-xs text-gray-500">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""} for "{search}"
        </p>
      )}

      {filter === "web_polls" ? (
        <div className="space-y-2">
          <button
            onClick={onNewWebPoll}
            className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-blue-500/30 hover:border-blue-500/60 hover:bg-blue-500/5 transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-sm text-blue-400 font-medium">Create New Web Poll</span>
          </button>
          {webPolls.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-gray-500 text-sm">No web polls yet. Create one to get started.</p>
            </div>
          ) : (
            webPolls.map((poll) => {
              const isShared = poll.id === sharedPollId;
              const isConfirming = confirmDeleteId === poll.id;
              const isDeleting = deletingPollId === poll.id;
              return (
                <div
                  key={poll.id}
                  className={`card overflow-hidden transition-colors ${
                    isShared ? "bg-red-500/10 border-red-500/30" : ""
                  }`}
                >
                  <div className="flex items-center">
                    <button
                      onClick={() => onSelectPoll(poll.group, poll)}
                      className="flex-1 flex items-center gap-3 p-3 min-w-0 hover:bg-gray-800/50 transition-colors"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isShared ? "bg-red-500/20" : "bg-blue-500/20"
                      }`}>
                        <span className="text-sm">{isShared ? "📡" : "🌐"}</span>
                      </div>
                      <div className="text-left min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{poll.title}</p>
                          {isShared && (
                            <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-white" />
                              On Air
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-600">
                          {new Date(poll.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <p className="text-xs text-gray-500">
                          {poll.options.length} options · {poll._count?.votes || 0} votes
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-1 px-2 shrink-0">
                      {isConfirming ? (
                        <>
                          <button
                            onClick={() => handleDeletePoll(poll.id)}
                            disabled={isDeleting}
                            className="px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-[10px] font-bold hover:bg-red-500/30 transition-colors disabled:opacity-50"
                          >
                            {isDeleting ? "..." : "Yes"}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 rounded-lg bg-gray-700 text-gray-400 text-[10px] font-bold hover:bg-gray-600 transition-colors"
                          >
                            No
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(poll.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete poll"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-gray-500 text-sm">
            {search
              ? "No groups match your search"
              : "No groups found. History sync may still be in progress."}
          </p>
          {groups.length === 0 && (
            <button onClick={fetchGroups} className="mt-3 text-wa-green text-sm underline">
              Try refreshing
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((group) => {
            const isExpanded = expandedGroup === group.id;
            const waPolls = group.polls.filter((p) => p.source !== "web");
            return (
              <div key={group.id} className="card overflow-hidden">
                <button
                  onClick={() => setExpandedGroup(isExpanded ? null : group.id)}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-wa-green/30 to-wa-teal/30 flex items-center justify-center text-lg font-bold text-wa-green shrink-0">
                      {group.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left min-w-0">
                      <p className="font-medium text-sm truncate">{group.name}</p>
                      <p className="text-xs text-gray-500">
                        {waPolls.length} poll{waPolls.length !== 1 ? "s" : ""}
                        {waPolls.length > 0 && (
                          <span className="text-wa-green ml-1">
                            · {waPolls.reduce((s, p) => s + (p._count?.votes || 0), 0)} votes
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-800 p-3 space-y-2 bg-gray-900/50">
                    <button
                      onClick={() => onNewPoll(group)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-wa-green/30 hover:border-wa-green/60 hover:bg-wa-green/5 transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-wa-green/20 flex items-center justify-center group-hover:bg-wa-green/30 transition-colors">
                        <svg className="w-4 h-4 text-wa-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <span className="text-sm text-wa-green font-medium">Create New Poll</span>
                    </button>

                    {waPolls.map((poll) => {
                      const isShared = poll.id === sharedPollId;
                      return (
                        <button
                          key={poll.id}
                          onClick={() => onSelectPoll(group, poll)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${
                            isShared ? "bg-red-500/10 border border-red-500/30 hover:bg-red-500/15" : "hover:bg-gray-800"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isShared ? "bg-red-500/20" : "bg-blue-500/20"
                            }`}>
                              <span className="text-sm">{isShared ? "📡" : "📊"}</span>
                            </div>
                            <div className="text-left min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate">{poll.title}</p>
                                {isShared && (
                                  <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                    On Air
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-600">
                                {new Date(poll.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </p>
                              <p className="text-xs text-gray-500">
                                {poll.options.length} options · {poll._count?.votes || 0} votes
                              </p>
                            </div>
                          </div>
                          <svg
                            className="w-4 h-4 text-gray-600 shrink-0"
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      );
                    })}

                    {waPolls.length === 0 && (
                      <p className="text-xs text-gray-600 text-center py-2">
                        No existing polls in this group
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
