import { useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "";

export default function Step2Groups({ socket, onSelectPoll, onNewPoll }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [filter, setFilter] = useState("all");

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
  }, [fetchGroups]);

  useEffect(() => {
    if (!socket) return;

    const refresh = () => fetchGroups();
    socket.on("history_sync_complete", refresh);
    socket.on("groups_updated", refresh);

    return () => {
      socket.off("history_sync_complete", refresh);
      socket.off("groups_updated", refresh);
    };
  }, [socket, fetchGroups]);

  const filtered = groups.filter((g) => {
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
      <div className="flex gap-2">
        {[
          { key: "all", label: `All (${groups.length})` },
          { key: "with_polls", label: `With Polls (${groups.filter((g) => g.polls.length > 0).length})` },
          { key: "no_polls", label: `No Polls (${groups.filter((g) => g.polls.length === 0).length})` },
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
      </div>

      {/* Results count */}
      {search && (
        <p className="text-xs text-gray-500">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""} for "{search}"
        </p>
      )}

      {filtered.length === 0 ? (
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
                        {group.polls.length} poll{group.polls.length !== 1 ? "s" : ""}
                        {group.polls.length > 0 && (
                          <span className="text-wa-green ml-1">
                            · {group.polls.reduce((s, p) => s + (p._count?.votes || 0), 0)} votes
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

                    {group.polls.map((poll) => (
                      <button
                        key={poll.id}
                        onClick={() => onSelectPoll(group, poll)}
                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-800 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                            <span className="text-sm">📊</span>
                          </div>
                          <div className="text-left min-w-0">
                            <p className="text-sm font-medium truncate">{poll.title}</p>
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
                    ))}

                    {group.polls.length === 0 && (
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
