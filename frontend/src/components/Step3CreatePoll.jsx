import { useState } from "react";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "";

export default function Step3CreatePoll({ group, onPollCreated, onBack }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [multiSelect, setMultiSelect] = useState(false);
  const [maxSelections, setMaxSelections] = useState(0);
  const [pollMode, setPollMode] = useState(group ? "whatsapp" : "web");

  const isWebOnly = pollMode === "web" || !group;
  const maxOptions = isWebOnly ? 100 : 12;

  const addOption = () => {
    if (options.length >= maxOptions) return;
    setOptions([...options, ""]);
  };

  const removeOption = (idx) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, i) => i !== idx));
  };

  const updateOption = (idx, value) => {
    const updated = [...options];
    updated[idx] = value;
    setOptions(updated);
  };

  const isValid =
    title.trim().length > 0 &&
    options.filter((o) => o.trim().length > 0).length >= 2;

  const handleSubmit = async () => {
    if (!isValid || sending) return;
    setError(null);
    setSending(true);

    try {
      const cleanOptions = options
        .map((o) => o.trim())
        .filter((o) => o.length > 0);

      const res = await fetch(`${API_BASE}/api/polls/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupJid: group?.jid || null,
          title: title.trim(),
          description: description.trim() || null,
          options: cleanOptions,
          selectableCount: multiSelect ? (maxSelections || 0) : 1,
          mode: isWebOnly ? "web" : "whatsapp",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create poll");
      }

      const poll = await res.json();
      onPollCreated(poll);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <div>
          <h2 className="text-xl font-bold">Create Poll</h2>
          <p className="text-gray-400 text-sm">
            {!group ? (
              <span className="text-blue-400">Web-Only Poll</span>
            ) : (
              <>Sending to <span className="text-wa-green">{group.name}</span></>
            )}
          </p>
        </div>
      </div>

      <div className="card p-6 space-y-5">
        {!group && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 text-xs text-blue-300 space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <p className="font-medium text-sm text-blue-300">Web-Only Poll</p>
            </div>
            <p className="text-blue-400/80">This poll is independent of WhatsApp. No option limit. Voting via web UI only. Web voting will be auto-enabled.</p>
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Poll Title
          </label>
          <input
            type="text"
            placeholder="What do you want to ask?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={255}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3
                       text-sm focus:outline-none focus:border-wa-green/50 focus:ring-1 focus:ring-wa-green/20
                       transition-all placeholder-gray-600"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Description{" "}
            <span className="text-gray-600 font-normal">(optional)</span>
          </label>
          <textarea
            placeholder="Add context or instructions..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3
                       text-sm focus:outline-none focus:border-wa-green/50 focus:ring-1 focus:ring-wa-green/20
                       transition-all placeholder-gray-600 resize-none"
          />
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-300">
            Options <span className="text-gray-600 font-normal">({options.length}{!isWebOnly ? "/12" : ""})</span>
          </label>
          {options.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-xs text-gray-600 w-5 text-right shrink-0">
                {idx + 1}.
              </span>
              <input
                type="text"
                placeholder={`Option ${idx + 1}`}
                value={opt}
                onChange={(e) => updateOption(idx, e.target.value)}
                maxLength={100}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5
                           text-sm focus:outline-none focus:border-wa-green/50 focus:ring-1 focus:ring-wa-green/20
                           transition-all placeholder-gray-600"
              />
              {options.length > 2 && (
                <button
                  onClick={() => removeOption(idx)}
                  className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center
                             hover:bg-red-500/20 transition-colors shrink-0"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          ))}

          {options.length < maxOptions && (
            <button
              onClick={addOption}
              className="flex items-center gap-2 text-sm text-wa-green hover:text-wa-green/80 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add option
            </button>
          )}
        </div>

        <div className="space-y-3 border-t border-gray-800 pt-5">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-gray-300">Multi-Select</label>
              <p className="text-xs text-gray-500 mt-0.5">Allow voters to choose more than one option</p>
            </div>
            <button
              type="button"
              onClick={() => setMultiSelect(!multiSelect)}
              className={`relative w-11 h-6 rounded-full transition-colors ${multiSelect ? "bg-wa-green" : "bg-gray-700"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${multiSelect ? "translate-x-5" : ""}`} />
            </button>
          </div>
          {multiSelect && (
            <div className="flex items-center gap-3 pl-1">
              <label className="text-xs text-gray-400">Max selections:</label>
              <select
                value={maxSelections}
                onChange={(e) => setMaxSelections(Number(e.target.value))}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-wa-green/50 text-gray-200"
              >
                <option value={0}>Unlimited</option>
                {options.filter((o) => o.trim()).length > 0 &&
                  Array.from({ length: Math.max(options.filter((o) => o.trim()).length - 1, 1) }, (_, i) => i + 2).map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))
                }
              </select>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!isValid || sending}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {sending ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {isWebOnly ? "Creating..." : "Sending..."}
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isWebOnly ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              )}
            </svg>
            {isWebOnly ? "Create Web Poll" : "Launch Poll"}
          </>
        )}
      </button>
    </div>
  );
}
