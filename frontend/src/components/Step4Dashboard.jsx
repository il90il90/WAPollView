import { useState, useEffect, useCallback, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, RadialBarChart, RadialBar, Legend,
} from "recharts";
import confetti from "canvas-confetti";

const API_BASE = import.meta.env.VITE_BACKEND_URL || "";

const COLORS = [
  "#25D366", "#34B7F1", "#FF6B6B", "#FFA726", "#AB47BC",
  "#26A69A", "#EF5350", "#42A5F5", "#66BB6A", "#FFA000",
];

function formatPhone(phoneOrJid) {
  if (!phoneOrJid) return "Unknown";
  const num = phoneOrJid.replace("@s.whatsapp.net", "").replace("@lid", "").replace("@c.us", "");
  if (/^\d+$/.test(num) && num.length > 6) {
    return `+${num.slice(0, 3)}-${num.slice(3, 5)}-${num.slice(5)}`;
  }
  return num;
}

function voterDisplay(voter) {
  if (typeof voter === "string") return { name: null, phone: formatPhone(voter), jid: voter };
  return {
    name: voter.name || null,
    phone: voter.phone ? formatPhone(voter.phone) : formatPhone(voter.jid),
    jid: voter.jid,
  };
}

function fireConfetti() {
  const count = 80;
  const defaults = { origin: { y: 0.7 }, zIndex: 9999 };
  confetti({ ...defaults, particleCount: count, spread: 80, startVelocity: 35, colors: ["#25D366", "#34B7F1", "#FFA726", "#FF6B6B", "#AB47BC"] });
  setTimeout(() => {
    confetti({ ...defaults, particleCount: count / 2, spread: 60, startVelocity: 25, origin: { x: 0.3, y: 0.6 }, colors: ["#25D366", "#66BB6A", "#26A69A"] });
  }, 150);
  setTimeout(() => {
    confetti({ ...defaults, particleCount: count / 2, spread: 60, startVelocity: 25, origin: { x: 0.7, y: 0.6 }, colors: ["#34B7F1", "#42A5F5", "#FFA000"] });
  }, 300);
}

function VoteSplash({ splash }) {
  if (!splash) return null;
  const displayName = splash.voterName || splash.voterPhone || "Someone";
  const nameLen = displayName.length;
  const size = Math.max(100, Math.min(220, 80 + nameLen * 12));
  const fontSize = Math.max(14, Math.min(28, 26 - nameLen * 0.6));
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      <div className="animate-vote-splash text-center">
        <div
          className="mx-auto mb-4 rounded-full bg-wa-green/20 border-4 border-wa-green/50 flex items-center justify-center font-bold text-wa-green shadow-2xl shadow-wa-green/30 animate-bounce-in p-3"
          style={{ width: size, height: size, fontSize }}
        >
          <span className="text-center leading-tight break-words max-w-[90%]">{displayName}</span>
        </div>
        <p className="text-lg md:text-xl text-gray-300 mt-2 font-medium">
          voted for
        </p>
        <div className="flex flex-wrap justify-center gap-2 mt-1">
          {(splash.selectedOption || "").split("|").map((opt, i) => (
            <p key={i} className="text-2xl md:text-3xl font-black text-wa-green drop-shadow-[0_0_20px_rgba(37,211,102,0.6)]">
              {opt}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

const TEMPLATES = [
  { key: "classic", label: "Classic", icon: "📊" },
  { key: "pie", label: "Pie", icon: "🍩" },
  { key: "bars", label: "Bars", icon: "📶" },
  { key: "radial", label: "Radial", icon: "🎯" },
  { key: "race", label: "Race", icon: "🏁" },
  { key: "podium", label: "Podium", icon: "🏆" },
  { key: "battle", label: "Battle", icon: "⚔️" },
  { key: "gauge", label: "Gauge", icon: "⏱️" },
  { key: "bubbles", label: "Bubbles", icon: "🫧" },
  { key: "neon", label: "Neon", icon: "💡" },
  { key: "stadium", label: "Stadium", icon: "🏟️" },
  { key: "waffle", label: "Waffle", icon: "🧇" },
  { key: "funnel", label: "Funnel", icon: "🔻" },
  { key: "emoji", label: "Emoji War", icon: "😎" },
];

const ANIMATED_TEMPLATES = [
  { key: "pulse", label: "Pulse Wave", icon: "💫" },
  { key: "slots", label: "Slot Machine", icon: "🎰" },
  { key: "particles", label: "Particles", icon: "✨" },
  { key: "bigscreen", label: "Big Screen", icon: "🖥️" },
];

function TemplateClassic({ votes, chartData, totalVotes, COLORS: colors, uniqueVoters, isMultiSelect, pctBase }) {
  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-3">
        {votes.map((v, idx) => {
          const pct = pctBase > 0 ? (v.count / pctBase) * 100 : 0;
          const voters = v.voters || [];
          return (
            <div key={v.optionId || idx} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: colors[idx % colors.length] }} />
                  <span className="text-sm font-medium truncate">{v.optionText}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold" style={{ color: colors[idx % colors.length] }}>{v.count}</span>
                  <span className="text-xs text-gray-500">({pct.toFixed(0)}%)</span>
                </div>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${pct}%`, backgroundColor: colors[idx % colors.length], minWidth: v.count > 0 ? "8px" : "0px" }}
                />
              </div>
              {voters.length > 0 && (
                <div className="flex flex-wrap gap-1 ml-5">
                  {voters.map((voter, vi) => {
                    const d = voterDisplay(voter);
                    return (
                      <span key={vi} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 cursor-default relative group" title={d.name ? d.phone : ""}>
                        {d.name || d.phone}
                        {d.name && (
                          <span className="hidden group-hover:inline-block absolute left-1/2 -translate-x-1/2 -top-7 bg-gray-700 text-gray-200 px-2 py-1 rounded text-[10px] whitespace-nowrap shadow-lg z-10 border border-gray-600">{d.phone}</span>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {votes.length === 0 && <div className="text-center py-6 text-gray-600 text-sm">No votes yet. Waiting for responses...</div>}
      </div>
      {chartData.length > 0 && totalVotes > 0 && (
        <div className="card p-4">
          <ResponsiveContainer width="100%" height={Math.max(120, chartData.length * 40)}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={90} tick={{ fill: "#9CA3AF", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#1F2937", border: "1px solid #374151", borderRadius: "12px", color: "#F9FAFB", fontSize: "12px" }} formatter={(value, _, props) => [`${value} votes`, props.payload.fullName]} cursor={{ fill: "rgba(37, 211, 102, 0.05)" }} />
              <Bar dataKey="votes" radius={[0, 8, 8, 0]} barSize={22} animationDuration={600}>
                {chartData.map((_, idx) => (<Cell key={idx} fill={colors[idx % colors.length]} fillOpacity={0.85} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function TemplatePie({ chartData, totalVotes, COLORS: colors, uniqueVoters, isMultiSelect, pctBase }) {
  const pieData = chartData.filter((d) => d.votes > 0).map((d, i) => ({ ...d, fill: colors[i % colors.length] }));
  if (pieData.length === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
  return (
    <div className="card p-6">
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={pieData}
            dataKey="votes"
            nameKey="fullName"
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={130}
            paddingAngle={3}
            animationDuration={800}
            label={({ fullName, votes: v }) => {
              const p = pctBase > 0 ? ((v / pctBase) * 100).toFixed(0) : 0;
              return `${fullName} (${p}%)`;
            }}
            labelLine={{ stroke: "#6B7280" }}
          >
            {pieData.map((entry, idx) => (<Cell key={idx} fill={entry.fill} />))}
          </Pie>
          <Tooltip contentStyle={{ background: "#1F2937", border: "1px solid #374151", borderRadius: "12px", color: "#F9FAFB", fontSize: "12px" }} formatter={(value) => [`${value} votes`]} />
        </PieChart>
      </ResponsiveContainer>
      <p className="text-center text-3xl font-black text-white mt-2">{isMultiSelect ? uniqueVoters : totalVotes}</p>
      <p className="text-center text-xs text-gray-500">{isMultiSelect ? `Voters (${totalVotes} selections)` : "Total Votes"}</p>
    </div>
  );
}

function TemplateBars({ chartData, COLORS: colors }) {
  if (chartData.length === 0 || chartData.every((d) => d.votes === 0)) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
  return (
    <div className="card p-6">
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
          <XAxis dataKey="name" tick={{ fill: "#9CA3AF", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fill: "#6B7280", fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: "#1F2937", border: "1px solid #374151", borderRadius: "12px", color: "#F9FAFB", fontSize: "12px" }} formatter={(value, _, props) => [`${value} votes`, props.payload.fullName]} cursor={{ fill: "rgba(37, 211, 102, 0.05)" }} />
          <Bar dataKey="votes" radius={[8, 8, 0, 0]} barSize={50} animationDuration={600} label={{ position: "top", fill: "#E5E7EB", fontSize: 14, fontWeight: "bold" }}>
            {chartData.map((_, idx) => (<Cell key={idx} fill={colors[idx % colors.length]} fillOpacity={0.9} />))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TemplateRadial({ chartData, totalVotes, COLORS: colors }) {
  const radialData = chartData.filter((d) => d.votes > 0).map((d, i) => ({ ...d, fill: colors[i % colors.length] }));
  if (radialData.length === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
  const leader = radialData.reduce((a, b) => (a.votes > b.votes ? a : b), radialData[0]);
  return (
    <div className="card p-6">
      <ResponsiveContainer width="100%" height={350}>
        <RadialBarChart cx="50%" cy="50%" innerRadius="25%" outerRadius="90%" data={radialData} startAngle={180} endAngle={-180} barSize={18}>
          <RadialBar background={{ fill: "#1F2937" }} dataKey="votes" animationDuration={800} label={{ position: "insideStart", fill: "#fff", fontSize: 10 }} />
          <Legend iconSize={10} layout="horizontal" verticalAlign="bottom" align="center" formatter={(value, entry) => <span style={{ color: "#D1D5DB", fontSize: 11 }}>{entry.payload.fullName}</span>} />
          <Tooltip contentStyle={{ background: "#1F2937", border: "1px solid #374151", borderRadius: "12px", color: "#F9FAFB", fontSize: "12px" }} formatter={(value) => [`${value} votes`]} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="text-center -mt-4">
        <p className="text-xs text-gray-500">Leading</p>
        <p className="text-lg font-black text-wa-green">{leader.fullName}</p>
      </div>
    </div>
  );
}

function TemplateRace({ votes, totalVotes, COLORS: colors, pctBase }) {
  const sorted = [...votes].sort((a, b) => b.count - a.count);
  if (sorted.length === 0 || totalVotes === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
  const max = sorted[0].count;
  return (
    <div className="card p-5 space-y-3">
      {sorted.map((v, idx) => {
        const origIdx = votes.indexOf(v);
        const pct = max > 0 ? (v.count / max) * 100 : 0;
        const votePct = pctBase > 0 ? (v.count / pctBase) * 100 : 0;
        return (
          <div key={v.optionId || idx} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-base md:text-lg font-bold truncate" style={{ color: colors[origIdx % colors.length] }}>{v.optionText}</span>
              <span className="text-xl md:text-2xl font-black text-white ml-3 shrink-0">{v.count} <span className="text-sm font-normal text-gray-500">({votePct.toFixed(0)}%)</span></span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-8 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out flex items-center px-3"
                style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: colors[origIdx % colors.length] }}
              >
                {pct > 15 && <span className="text-xs font-bold text-white/90 truncate">{v.optionText}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TemplatePodium({ votes, totalVotes, COLORS: colors, pctBase }) {
  const sorted = [...votes].filter((v) => v.count > 0).sort((a, b) => b.count - a.count);
  if (sorted.length === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const medals = ["🥇", "🥈", "🥉"];
  const podiumHeights = [180, 130, 100];
  const podiumColors = ["from-yellow-500/30 to-yellow-600/10 border-yellow-500/60", "from-gray-300/20 to-gray-400/10 border-gray-400/50", "from-amber-700/20 to-amber-800/10 border-amber-700/40"];
  const podiumOrder = top3.length >= 3 ? [1, 0, 2] : top3.length === 2 ? [1, 0] : [0];

  return (
    <div className="card p-6 space-y-6">
      <div className="flex items-end justify-center gap-3 md:gap-6" style={{ minHeight: 260 }}>
        {podiumOrder.map((rank) => {
          const v = top3[rank];
          if (!v) return null;
          const origIdx = votes.indexOf(v);
          const pct = pctBase > 0 ? (v.count / pctBase) * 100 : 0;
          return (
            <div key={v.optionId || rank} className="flex flex-col items-center" style={{ width: top3.length <= 2 ? "40%" : "30%" }}>
              <span className="text-3xl md:text-4xl mb-2">{medals[rank]}</span>
              <p className="text-sm md:text-base font-bold text-white text-center truncate w-full mb-1">{v.optionText}</p>
              <p className="text-xs text-gray-400 mb-2">{v.count} votes ({pct.toFixed(0)}%)</p>
              <div
                className={`w-full rounded-t-xl bg-gradient-to-b border-t-2 border-x-2 ${podiumColors[rank]} flex items-end justify-center pb-3 transition-all duration-700`}
                style={{ height: podiumHeights[rank] }}
              >
                <span className="text-3xl md:text-5xl font-black" style={{ color: colors[origIdx % colors.length] }}>{v.count}</span>
              </div>
            </div>
          );
        })}
      </div>
      {rest.length > 0 && (
        <div className="space-y-2 border-t border-gray-800 pt-4">
          {rest.map((v, i) => {
            const origIdx = votes.indexOf(v);
            const pct = pctBase > 0 ? (v.count / pctBase) * 100 : 0;
            return (
              <div key={v.optionId || i} className="flex items-center gap-3 px-2">
                <span className="text-gray-500 font-bold text-sm w-6 text-right">{i + 4}</span>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colors[origIdx % colors.length] }} />
                <span className="text-sm text-gray-300 flex-1 truncate">{v.optionText}</span>
                <span className="text-sm font-bold" style={{ color: colors[origIdx % colors.length] }}>{v.count}</span>
                <span className="text-xs text-gray-500">({pct.toFixed(0)}%)</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TemplateBattle({ votes, totalVotes, COLORS: colors, pctBase }) {
  const sorted = [...votes].sort((a, b) => b.count - a.count);
  if (sorted.length === 0 || totalVotes === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;

  if (sorted.length >= 2) {
    const a = sorted[0];
    const b = sorted[1];
    const aIdx = votes.indexOf(a);
    const bIdx = votes.indexOf(b);
    const aPct = pctBase > 0 ? (a.count / pctBase) * 100 : 0;
    const bPct = pctBase > 0 ? (b.count / pctBase) * 100 : 0;
    const others = sorted.slice(2);
    return (
      <div className="space-y-4">
        <div className="card p-0 overflow-hidden">
          <div className="flex min-h-[200px]">
            <div className="flex-1 p-5 flex flex-col items-center justify-center text-center relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${colors[aIdx % colors.length]}22, transparent)` }}>
              <div className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: colors[aIdx % colors.length], color: "#fff" }}>LEADING</div>
              <p className="text-lg md:text-2xl font-black text-white mt-4 mb-1">{a.optionText}</p>
              <p className="text-4xl md:text-6xl font-black mb-1" style={{ color: colors[aIdx % colors.length] }}>{a.count}</p>
              <p className="text-sm text-gray-400">{aPct.toFixed(1)}%</p>
            </div>
            <div className="flex items-center justify-center px-2 relative">
              <div className="w-12 h-12 rounded-full bg-gray-800 border-2 border-gray-600 flex items-center justify-center z-10">
                <span className="text-sm font-black text-gray-300">VS</span>
              </div>
              <div className="absolute top-0 bottom-0 w-px bg-gray-700" />
            </div>
            <div className="flex-1 p-5 flex flex-col items-center justify-center text-center relative overflow-hidden" style={{ background: `linear-gradient(225deg, ${colors[bIdx % colors.length]}22, transparent)` }}>
              <p className="text-lg md:text-2xl font-black text-white mb-1">{b.optionText}</p>
              <p className="text-4xl md:text-6xl font-black mb-1" style={{ color: colors[bIdx % colors.length] }}>{b.count}</p>
              <p className="text-sm text-gray-400">{bPct.toFixed(1)}%</p>
            </div>
          </div>
          <div className="h-2 flex">
            <div className="transition-all duration-700" style={{ width: `${aPct || 50}%`, backgroundColor: colors[aIdx % colors.length] }} />
            <div className="transition-all duration-700" style={{ width: `${bPct || 50}%`, backgroundColor: colors[bIdx % colors.length] }} />
          </div>
        </div>
        {others.length > 0 && (
          <div className="card p-4 space-y-2">
            {others.map((v, i) => {
              const origIdx = votes.indexOf(v);
              const pct = pctBase > 0 ? (v.count / pctBase) * 100 : 0;
              return (
                <div key={v.optionId || i} className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colors[origIdx % colors.length] }} />
                  <span className="text-sm text-gray-300 flex-1 truncate">{v.optionText}</span>
                  <span className="text-sm font-bold" style={{ color: colors[origIdx % colors.length] }}>{v.count}</span>
                  <span className="text-xs text-gray-500">({pct.toFixed(0)}%)</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return <TemplateRace votes={votes} totalVotes={totalVotes} COLORS={colors} pctBase={pctBase} />;
}

function TemplateGauge({ votes, totalVotes, COLORS: colors, pctBase }) {
  if (votes.length === 0 || totalVotes === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {votes.map((v, idx) => {
        const pct = pctBase > 0 ? (v.count / pctBase) * 100 : 0;
        const angle = (pct / 100) * 180;
        const color = colors[idx % colors.length];
        return (
          <div key={v.optionId || idx} className="card p-4 flex flex-col items-center">
            <svg viewBox="0 0 120 70" className="w-full max-w-[160px]">
              <path d="M 10 65 A 50 50 0 0 1 110 65" fill="none" stroke="#1F2937" strokeWidth="10" strokeLinecap="round" />
              <path
                d="M 10 65 A 50 50 0 0 1 110 65"
                fill="none"
                stroke={color}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${(angle / 180) * 157} 157`}
                className="transition-all duration-700"
                style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
              />
              <text x="60" y="58" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="900">{pct.toFixed(0)}%</text>
              <text x="60" y="68" textAnchor="middle" fill="#9CA3AF" fontSize="7">{v.count} votes</text>
            </svg>
            <p className="text-xs md:text-sm font-bold text-center mt-1 truncate w-full" style={{ color }}>{v.optionText}</p>
          </div>
        );
      })}
    </div>
  );
}

function TemplateBubbles({ votes, totalVotes, COLORS: colors, pctBase, isMultiSelect, uniqueVoters }) {
  if (votes.length === 0 || totalVotes === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
  const maxCount = Math.max(...votes.map((v) => v.count), 1);
  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center justify-center gap-4 min-h-[300px]">
        {votes.map((v, idx) => {
          const pct = pctBase > 0 ? (v.count / pctBase) * 100 : 0;
          const ratio = v.count / maxCount;
          const size = Math.max(60, Math.round(40 + ratio * 140));
          const color = colors[idx % colors.length];
          const fontSize = Math.max(10, Math.min(18, size / 6));
          return (
            <div
              key={v.optionId || idx}
              className="rounded-full flex flex-col items-center justify-center text-center transition-all duration-700 shrink-0"
              style={{
                width: size,
                height: size,
                backgroundColor: `${color}20`,
                border: `3px solid ${color}88`,
                boxShadow: v.count > 0 ? `0 0 ${10 + ratio * 20}px ${color}44, inset 0 0 ${ratio * 15}px ${color}22` : "none",
              }}
            >
              <span className="font-black text-white leading-none" style={{ fontSize: fontSize * 1.4 }}>{v.count}</span>
              <span className="font-medium truncate max-w-[85%] leading-tight mt-0.5" style={{ fontSize, color }}>{v.optionText}</span>
              {size > 80 && <span className="text-gray-500 leading-none mt-0.5" style={{ fontSize: fontSize * 0.7 }}>{pct.toFixed(0)}%</span>}
            </div>
          );
        })}
      </div>
      <p className="text-center text-xs text-gray-500 mt-4">{isMultiSelect ? `${uniqueVoters} Voters · ${totalVotes} Selections` : `${totalVotes} Total Votes`}</p>
    </div>
  );
}

function TemplateNeon({ votes, totalVotes, COLORS: colors, pctBase }) {
  if (votes.length === 0 || totalVotes === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
  const sorted = [...votes].sort((a, b) => b.count - a.count);
  return (
    <div className="space-y-3">
      {sorted.map((v, idx) => {
        const origIdx = votes.indexOf(v);
        const color = colors[origIdx % colors.length];
        const pct = pctBase > 0 ? (v.count / pctBase) * 100 : 0;
        const isLeader = idx === 0 && v.count > 0;
        return (
          <div
            key={v.optionId || idx}
            className="rounded-xl p-4 relative overflow-hidden transition-all duration-500"
            style={{
              background: `linear-gradient(135deg, ${color}12, ${color}06)`,
              border: `1px solid ${color}${isLeader ? "80" : "30"}`,
              boxShadow: isLeader ? `0 0 20px ${color}33, inset 0 0 30px ${color}08` : "none",
            }}
          >
            {isLeader && <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }} />}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {isLeader && <span className="text-xs font-black px-1.5 py-0.5 rounded" style={{ backgroundColor: color, color: "#000" }}>LEAD</span>}
                <span className="text-base md:text-lg font-bold" style={{ color, textShadow: `0 0 20px ${color}66` }}>{v.optionText}</span>
              </div>
              <span className="text-2xl md:text-3xl font-black" style={{ color, textShadow: `0 0 15px ${color}88` }}>{v.count}</span>
            </div>
            <div className="w-full bg-gray-900 rounded-full h-2 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
            </div>
            <div className="text-right mt-1">
              <span className="text-xs font-medium" style={{ color: `${color}99` }}>{pct.toFixed(1)}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TemplateStadium({ votes, totalVotes, COLORS: colors, pctBase, isMultiSelect, uniqueVoters }) {
  if (votes.length === 0 || totalVotes === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
  const sorted = [...votes].sort((a, b) => b.count - a.count);
  const leader = sorted[0];
  return (
    <div className="space-y-4">
      <div className="card p-0 overflow-hidden" style={{ background: "linear-gradient(180deg, #0a1628 0%, #111827 100%)" }}>
        <div className="text-center py-3 border-b border-gray-800" style={{ background: "linear-gradient(90deg, transparent, rgba(37,211,102,0.1), transparent)" }}>
          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500 font-bold">Live Scoreboard</p>
        </div>
        <div className="p-4 space-y-0">
          {sorted.map((v, idx) => {
            const origIdx = votes.indexOf(v);
            const color = colors[origIdx % colors.length];
            const pct = pctBase > 0 ? (v.count / pctBase) * 100 : 0;
            const isTop = v === leader;
            return (
              <div
                key={v.optionId || idx}
                className={`flex items-center gap-3 px-3 py-2.5 ${idx > 0 ? "border-t border-gray-800/50" : ""} transition-all duration-300`}
                style={isTop ? { background: `linear-gradient(90deg, ${color}15, transparent)` } : {}}
              >
                <span className="text-lg md:text-xl font-black w-8 text-center" style={{ color: isTop ? color : "#6B7280" }}>{idx + 1}</span>
                <div className="w-1 self-stretch rounded-full" style={{ backgroundColor: color }} />
                <span className="flex-1 text-sm md:text-base font-bold text-gray-200 truncate">{v.optionText}</span>
                <div className="flex items-baseline gap-2 shrink-0">
                  <span className="text-2xl md:text-3xl font-black tabular-nums" style={{ color }}>{v.count}</span>
                  <span className="text-xs text-gray-500 font-mono">{pct.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="border-t border-gray-800 px-4 py-2 flex items-center justify-between text-xs text-gray-500">
          <span>{isMultiSelect ? `${uniqueVoters} voters · ${totalVotes} selections` : `${totalVotes} total votes`}</span>
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />LIVE</span>
        </div>
      </div>
    </div>
  );
}

function TemplateWaffle({ votes, totalVotes, COLORS: colors, pctBase, isMultiSelect, uniqueVoters }) {
  if (votes.length === 0 || totalVotes === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
  const gridSize = 100;
  const cells = [];
  let filled = 0;
  votes.forEach((v, idx) => {
    const count = pctBase > 0 ? Math.round((v.count / pctBase) * gridSize) : 0;
    for (let i = 0; i < count && filled < gridSize; i++) {
      cells[filled] = colors[idx % colors.length];
      filled++;
    }
  });
  while (filled < gridSize) { cells[filled] = "#1F2937"; filled++; }

  return (
    <div className="card p-5 space-y-4">
      <div className="grid grid-cols-10 gap-1 max-w-xs mx-auto">
        {cells.map((color, i) => (
          <div
            key={i}
            className="aspect-square rounded-sm transition-all duration-500"
            style={{ backgroundColor: color, opacity: color === "#1F2937" ? 0.4 : 0.85 }}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
        {votes.map((v, idx) => {
          const color = colors[idx % colors.length];
          const pct = pctBase > 0 ? (v.count / pctBase) * 100 : 0;
          return (
            <div key={v.optionId || idx} className="flex items-center gap-1.5 text-xs">
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: color }} />
              <span className="text-gray-300 font-medium">{v.optionText}</span>
              <span className="text-gray-500">{v.count} ({pct.toFixed(0)}%)</span>
            </div>
          );
        })}
      </div>
      <p className="text-center text-2xl font-black text-white">{isMultiSelect ? uniqueVoters : totalVotes} <span className="text-sm font-normal text-gray-500">{isMultiSelect ? "voters" : "votes"}</span></p>
    </div>
  );
}

function TemplateFunnel({ votes, totalVotes, COLORS: colors, pctBase, isMultiSelect, uniqueVoters }) {
  const sorted = [...votes].filter((v) => v.count > 0).sort((a, b) => b.count - a.count);
  if (sorted.length === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
  const max = sorted[0].count;
  return (
    <div className="card p-5 space-y-2">
      {sorted.map((v, idx) => {
        const origIdx = votes.indexOf(v);
        const color = colors[origIdx % colors.length];
        const widthPct = max > 0 ? (v.count / max) * 100 : 0;
        const votePct = pctBase > 0 ? (v.count / pctBase) * 100 : 0;
        return (
          <div key={v.optionId || idx} className="flex flex-col items-center">
            <div
              className="relative rounded-lg py-2.5 px-4 flex items-center justify-between transition-all duration-700 overflow-hidden"
              style={{
                width: `${Math.max(widthPct, 25)}%`,
                background: `linear-gradient(135deg, ${color}33, ${color}15)`,
                border: `1px solid ${color}44`,
              }}
            >
              <span className="text-xs md:text-sm font-bold text-white truncate">{v.optionText}</span>
              <span className="text-sm md:text-base font-black shrink-0 ml-2" style={{ color }}>{v.count}</span>
            </div>
            {idx < sorted.length - 1 && (
              <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[5px] border-l-transparent border-r-transparent" style={{ borderTopColor: `${color}40` }} />
            )}
          </div>
        );
      })}
      <p className="text-center text-xs text-gray-500 mt-2">{isMultiSelect ? `${uniqueVoters} voters · ${totalVotes} selections` : `${totalVotes} total votes`}</p>
    </div>
  );
}

function TemplateEmoji({ votes, totalVotes, COLORS: colors, pctBase }) {
  if (votes.length === 0 || totalVotes === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
  const sorted = [...votes].sort((a, b) => b.count - a.count);
  const emojiList = ["🔥", "⚡", "💎", "🚀", "🌟", "💥", "🎯", "👑", "⭐", "🏅"];
  return (
    <div className="card p-5 space-y-4">
      <p className="text-center text-[10px] uppercase tracking-[0.3em] text-gray-500 font-bold">Emoji War</p>
      <div className="space-y-3">
        {sorted.map((v, idx) => {
          const origIdx = votes.indexOf(v);
          const color = colors[origIdx % colors.length];
          const pct = pctBase > 0 ? (v.count / pctBase) * 100 : 0;
          const emoji = emojiList[origIdx % emojiList.length];
          const repeatCount = Math.min(Math.max(v.count, 0), 20);
          const isLeader = idx === 0;
          return (
            <div key={v.optionId || idx} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isLeader && <span className="text-lg">👑</span>}
                  <span className={`text-sm md:text-base font-bold ${isLeader ? "text-yellow-400" : "text-gray-200"}`}>{v.optionText}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xl font-black" style={{ color }}>{v.count}</span>
                  <span className="text-xs text-gray-500">({pct.toFixed(0)}%)</span>
                </div>
              </div>
              <div className="text-lg leading-relaxed tracking-wider" style={{ wordBreak: "break-all" }}>
                {repeatCount > 0 ? Array.from({ length: repeatCount }, (_, i) => <span key={i} className="inline-block transition-all duration-300" style={{ opacity: 0.5 + (i / repeatCount) * 0.5 }}>{emoji}</span>) : <span className="text-gray-600 text-sm">--</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TemplatePulse({ votes, totalVotes, COLORS: colors, pctBase }) {
  if (votes.length === 0 || totalVotes === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
  const sorted = [...votes].sort((a, b) => b.count - a.count);
  const max = sorted[0].count || 1;

  return (
    <div className="space-y-3">
      {sorted.map((v, idx) => {
        const origIdx = votes.indexOf(v);
        const color = colors[origIdx % colors.length];
        const pct = pctBase > 0 ? (v.count / pctBase) * 100 : 0;
        const barW = max > 0 ? (v.count / max) * 100 : 0;
        const isLeader = idx === 0;
        return (
          <div
            key={v.optionId || idx}
            className={`rounded-xl p-4 transition-all duration-500 ${isLeader ? "animate-pulse-glow" : ""}`}
            style={{
              "--glow-color": `${color}55`,
              background: `linear-gradient(135deg, ${color}10, ${color}04)`,
              border: `1px solid ${color}${isLeader ? "55" : "22"}`,
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {isLeader && (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: color }} />
                    <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: color }} />
                  </span>
                )}
                <span className="text-sm md:text-base font-bold" style={{ color: isLeader ? color : "#E5E7EB" }}>{v.optionText}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl md:text-3xl font-black tabular-nums" style={{ color }}>{v.count}</span>
                <span className="text-xs text-gray-500">{pct.toFixed(0)}%</span>
              </div>
            </div>
            <div className="w-full bg-gray-900 rounded-full h-4 overflow-hidden relative">
              <div
                className="h-full rounded-full transition-all duration-700 relative overflow-hidden"
                style={{ width: `${Math.max(barW, 3)}%`, backgroundColor: `${color}44` }}
              >
                <div
                  className="absolute inset-0 animate-wave-fill"
                  style={{
                    backgroundImage: `linear-gradient(90deg, transparent 0%, ${color} 25%, ${color}dd 50%, ${color} 75%, transparent 100%)`,
                    backgroundSize: "200% 100%",
                  }}
                />
              </div>
              {v.count > 0 && Array.from({ length: Math.min(v.count, 5) }, (_, i) => (
                <div
                  key={i}
                  className="absolute bottom-full animate-float-up"
                  style={{
                    left: `${15 + i * 18}%`,
                    animationDelay: `${i * 0.4}s`,
                    animationDuration: `${1.5 + Math.random()}s`,
                    color,
                    fontSize: "10px",
                  }}
                >
                  ●
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TemplateSlots({ votes, totalVotes, COLORS: colors, pctBase, isMultiSelect, uniqueVoters }) {
  if (votes.length === 0 || totalVotes === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
  const sorted = [...votes].sort((a, b) => b.count - a.count);
  const tickerText = sorted.map((v) => `${v.optionText}: ${v.count} votes`).join("   ★   ");

  return (
    <div className="card p-0 overflow-hidden" style={{ background: "linear-gradient(180deg, #1a0a2e 0%, #111827 50%)" }}>
      <div className="bg-gradient-to-r from-purple-900/30 via-pink-900/20 to-purple-900/30 border-b border-purple-800/30 py-2 overflow-hidden relative">
        <div className="animate-ticker whitespace-nowrap text-xs text-purple-300/70 font-mono">
          {tickerText}   ★   {tickerText}
        </div>
      </div>
      <div className="text-center py-3">
        <p className="text-sm font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400">🎰 SLOT MACHINE 🎰</p>
      </div>
      <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
        {sorted.map((v, idx) => {
          const origIdx = votes.indexOf(v);
          const color = colors[origIdx % colors.length];
          const pct = pctBase > 0 ? (v.count / pctBase) * 100 : 0;
          const isJackpot = idx === 0;
          return (
            <div
              key={v.optionId || idx}
              className="rounded-xl p-3 text-center relative overflow-hidden"
              style={{
                background: `linear-gradient(180deg, ${color}15, ${color}05)`,
                border: `2px solid ${color}${isJackpot ? "66" : "22"}`,
                boxShadow: isJackpot ? `0 0 20px ${color}22, inset 0 0 20px ${color}08` : "none",
              }}
            >
              {isJackpot && (
                <div className="absolute top-0 left-0 right-0 h-full animate-shimmer opacity-20" style={{ backgroundImage: `linear-gradient(90deg, transparent, ${color}44, transparent)`, backgroundSize: "200% 100%" }} />
              )}
              <p className="text-xs font-bold text-gray-300 truncate mb-2 relative z-10">{v.optionText}</p>
              <div className="overflow-hidden h-14 flex items-center justify-center relative z-10">
                <div className="animate-slot-digit" style={{ animationDelay: `${idx * 0.15}s` }}>
                  <span className="text-4xl md:text-5xl font-black tabular-nums" style={{ color, textShadow: `0 0 20px ${color}66` }}>{v.count}</span>
                </div>
              </div>
              <p className="text-[10px] text-gray-500 mt-1 relative z-10">{pct.toFixed(1)}%</p>
              {isJackpot && <p className="text-[9px] font-black text-yellow-400 mt-1 relative z-10">🏆 JACKPOT</p>}
            </div>
          );
        })}
      </div>
      <div className="border-t border-purple-900/30 px-4 py-2 text-center text-xs text-purple-400/60">
        {isMultiSelect ? `${uniqueVoters} players · ${totalVotes} spins` : `${totalVotes} spins total`}
      </div>
    </div>
  );
}

function TemplateParticles({ votes, totalVotes, COLORS: colors, pctBase, isMultiSelect, uniqueVoters }) {
  if (votes.length === 0 || totalVotes === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
  const sorted = [...votes].sort((a, b) => b.count - a.count);
  const max = sorted[0].count || 1;

  return (
    <div className="card p-5" style={{ background: "linear-gradient(180deg, #050d1a 0%, #111827 100%)" }}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {sorted.map((v, idx) => {
          const origIdx = votes.indexOf(v);
          const color = colors[origIdx % colors.length];
          const pct = pctBase > 0 ? (v.count / pctBase) * 100 : 0;
          const ratio = v.count / max;
          const particleCount = Math.min(Math.max(Math.round(ratio * 8), 2), 8);
          const isLeader = idx === 0;
          return (
            <div
              key={v.optionId || idx}
              className="relative flex flex-col items-center justify-center text-center py-6 px-3 rounded-xl"
              style={{
                background: `radial-gradient(circle at 50% 50%, ${color}12, transparent 70%)`,
                border: `1px solid ${color}${isLeader ? "44" : "15"}`,
                minHeight: 140,
              }}
            >
              {Array.from({ length: particleCount }, (_, i) => (
                <div
                  key={i}
                  className="absolute animate-orbit"
                  style={{
                    "--orbit-r": `${25 + (i % 3) * 15}px`,
                    "--orbit-speed": `${2.5 + i * 0.7}s`,
                    animationDelay: `${i * -0.5}s`,
                    top: "50%",
                    left: "50%",
                    width: 0,
                    height: 0,
                  }}
                >
                  <span
                    className="block rounded-full"
                    style={{
                      width: `${4 + (particleCount - i) * 1}px`,
                      height: `${4 + (particleCount - i) * 1}px`,
                      backgroundColor: color,
                      boxShadow: `0 0 ${6 + i * 2}px ${color}`,
                      opacity: 0.6 + (i / particleCount) * 0.4,
                    }}
                  />
                </div>
              ))}
              <span className="text-3xl md:text-4xl font-black relative z-10 tabular-nums" style={{ color, textShadow: `0 0 25px ${color}55` }}>{v.count}</span>
              <span className="text-xs font-bold text-gray-300 mt-1 relative z-10 truncate max-w-full">{v.optionText}</span>
              <span className="text-[10px] text-gray-500 relative z-10">{pct.toFixed(0)}%</span>
              {isLeader && (
                <span className="absolute top-2 right-2 text-[9px] font-black px-1.5 py-0.5 rounded animate-pulse" style={{ backgroundColor: `${color}33`, color }}>★</span>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-center text-xs text-gray-600 mt-4">{isMultiSelect ? `${uniqueVoters} voters · ${totalVotes} selections` : `${totalVotes} votes`} · particles mode</p>
    </div>
  );
}

function TemplateBigScreen({ votes, totalVotes, COLORS: colors, pctBase, isMultiSelect, uniqueVoters }) {
  if (votes.length === 0 || totalVotes === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
  const sorted = [...votes].sort((a, b) => b.count - a.count);
  const max = sorted[0].count || 1;
  const tickerText = sorted.map((v) => `${v.optionText} — ${v.count}`).join("     ★     ");

  return (
    <div className="card p-0 overflow-hidden" style={{ background: "linear-gradient(180deg, #020617 0%, #0f172a 100%)" }}>
      {/* Ticker bar */}
      <div className="bg-gradient-to-r from-wa-green/10 via-blue-500/10 to-wa-green/10 border-b border-gray-800/50 py-1.5 overflow-hidden relative">
        <div className="animate-ticker whitespace-nowrap text-xs font-mono text-wa-green/60">
          {tickerText}     ★     {tickerText}
        </div>
      </div>

      {/* Title */}
      <div className="text-center py-4 md:py-6">
        <p className="text-lg md:text-2xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-wa-green via-cyan-400 to-wa-green animate-shimmer" style={{ backgroundSize: "200% auto" }}>
          LIVE RESULTS
        </p>
        <p className="text-xs md:text-sm text-gray-500 mt-1">{isMultiSelect ? `${uniqueVoters} voters · ${totalVotes} selections` : `${totalVotes} votes`}</p>
      </div>

      {/* Main bars */}
      <div className="px-4 md:px-8 pb-6 space-y-4 md:space-y-5">
        {sorted.map((v, idx) => {
          const origIdx = votes.indexOf(v);
          const color = colors[origIdx % colors.length];
          const pct = pctBase > 0 ? (v.count / pctBase) * 100 : 0;
          const barW = max > 0 ? (v.count / max) * 100 : 0;
          const isLeader = idx === 0;
          return (
            <div key={v.optionId || idx} className="space-y-2">
              <div className="flex items-end justify-between">
                <div className="flex items-center gap-2 md:gap-3">
                  {isLeader && (
                    <span className="relative flex h-3 w-3 md:h-4 md:w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: color }} />
                      <span className="relative inline-flex rounded-full h-3 w-3 md:h-4 md:w-4" style={{ backgroundColor: color }} />
                    </span>
                  )}
                  <span className="text-lg md:text-2xl lg:text-3xl font-black" style={{ color: isLeader ? color : "#E5E7EB" }}>{v.optionText}</span>
                </div>
                <div className="flex items-baseline gap-2 shrink-0">
                  <span className="text-3xl md:text-5xl lg:text-6xl font-black tabular-nums" style={{ color, textShadow: `0 0 30px ${color}44` }}>{v.count}</span>
                  <span className="text-sm md:text-base text-gray-500 font-mono">{pct.toFixed(0)}%</span>
                </div>
              </div>
              <div className="w-full bg-gray-900/80 rounded-full h-6 md:h-8 lg:h-10 overflow-hidden relative">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                  style={{ width: `${Math.max(barW, 2)}%`, backgroundColor: `${color}33` }}
                >
                  <div
                    className="absolute inset-0 animate-wave-fill"
                    style={{
                      backgroundImage: `linear-gradient(90deg, transparent 0%, ${color}cc 25%, ${color} 50%, ${color}cc 75%, transparent 100%)`,
                      backgroundSize: "200% 100%",
                    }}
                  />
                </div>
                {v.count > 0 && isLeader && Array.from({ length: 3 }, (_, i) => (
                  <div
                    key={i}
                    className="absolute bottom-full animate-float-up"
                    style={{
                      left: `${20 + i * 30}%`,
                      animationDelay: `${i * 0.6}s`,
                      animationDuration: `${2 + Math.random()}s`,
                      color,
                      fontSize: "14px",
                    }}
                  >
                    ▲
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800/50 px-6 py-2.5 flex items-center justify-between text-xs text-gray-600">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="font-mono">LIVE</span>
        </span>
        <span className="font-mono">Optimized for projection</span>
      </div>
    </div>
  );
}

function renderTemplate(templateKey, props) {
  switch (templateKey) {
    case "pie": return <TemplatePie {...props} />;
    case "bars": return <TemplateBars {...props} />;
    case "radial": return <TemplateRadial {...props} />;
    case "race": return <TemplateRace {...props} />;
    case "podium": return <TemplatePodium {...props} />;
    case "battle": return <TemplateBattle {...props} />;
    case "gauge": return <TemplateGauge {...props} />;
    case "bubbles": return <TemplateBubbles {...props} />;
    case "neon": return <TemplateNeon {...props} />;
    case "stadium": return <TemplateStadium {...props} />;
    case "waffle": return <TemplateWaffle {...props} />;
    case "funnel": return <TemplateFunnel {...props} />;
    case "emoji": return <TemplateEmoji {...props} />;
    case "pulse": return <TemplatePulse {...props} />;
    case "slots": return <TemplateSlots {...props} />;
    case "particles": return <TemplateParticles {...props} />;
    case "bigscreen": return <TemplateBigScreen {...props} />;
    default: return <TemplateClassic {...props} />;
  }
}

export default function Step4Dashboard({ socket, poll, group, onBack, isViewer, viewerTemplate }) {
  const [votes, setVotes] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [uniqueVoters, setUniqueVoters] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [voteLog, setVoteLog] = useState([]);
  const [tab, setTab] = useState("results");
  const [isSharedToViewer, setIsSharedToViewer] = useState(false);
  const [voteSplash, setVoteSplash] = useState(null);
  const [template, setTemplate] = useState(() => localStorage.getItem("pollTemplate") || "classic");
  const prevTotalRef = useRef(0);
  const refreshTimerRef = useRef(null);
  const splashTimerRef = useRef(null);
  const activeTemplate = isViewer ? (viewerTemplate || "classic") : template;
  const isMultiSelect = poll?.selectableCount !== 1;

  const showVoteToast = useCallback((voterName, voterPhone, selectedOption) => {
    if (!selectedOption) return;
    if (splashTimerRef.current) clearTimeout(splashTimerRef.current);
    setVoteSplash({ voterName, voterPhone, selectedOption });
    fireConfetti();
    splashTimerRef.current = setTimeout(() => setVoteSplash(null), 3500);
  }, []);

  const handleShareToViewer = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/viewer-poll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId: poll.id, template }),
      });
      const data = await res.json();
      if (data.success) setIsSharedToViewer(true);
    } catch (err) {
      console.error("Failed to share to viewer:", err);
    }
  };

  const handleUnshareFromViewer = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/viewer-poll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId: null }),
      });
      const data = await res.json();
      if (data.success) setIsSharedToViewer(false);
    } catch (err) {
      console.error("Failed to unshare from viewer:", err);
    }
  };

  const handleTemplateChange = async (key) => {
    setTemplate(key);
    localStorage.setItem("pollTemplate", key);
    try {
      await fetch(`${API_BASE}/api/viewer-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: key }),
      });
    } catch (err) {
      console.error("Failed to sync template:", err);
    }
  };

  useEffect(() => {
    if (isViewer) return;
    fetch(`${API_BASE}/api/viewer-poll`)
      .then((r) => r.json())
      .then((data) => { if (data.poll?.id === poll?.id) setIsSharedToViewer(true); })
      .catch(() => {});
  }, [poll?.id, isViewer]);

  const fetchData = useCallback(async () => {
    if (!poll?.id) return;
    try {
      const [votesRes, logRes] = await Promise.all([
        fetch(`${API_BASE}/api/polls/${poll.id}/votes`),
        fetch(`${API_BASE}/api/polls/${poll.id}/vote-log`),
      ]);
      const votesData = await votesRes.json();
      const logData = await logRes.json();
      const optionsArr = votesData.options || votesData;
      const newTotal = optionsArr.reduce((sum, v) => sum + v.count, 0);
      prevTotalRef.current = newTotal;

      setVotes(optionsArr);
      setTotalVotes(newTotal);
      setUniqueVoters(votesData.uniqueVoters ?? newTotal);
      setVoteLog(logData);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Failed to fetch poll data:", err);
    }
  }, [poll?.id]);

  useEffect(() => {
    fetchData();
    refreshTimerRef.current = setInterval(fetchData, 8000);
    return () => clearInterval(refreshTimerRef.current);
  }, [fetchData]);

  useEffect(() => {
    if (!socket || !poll?.id) return;
    socket.emit("subscribe_to_poll", { pollId: poll.id });

    const handleReconnect = () => {
      socket.emit("subscribe_to_poll", { pollId: poll.id });
      fetchData();
    };
    const handleVote = (data) => {
      if (data.pollId === poll.id) {
        fetchData();
        if (data.voter && data.selectedOption) {
          showVoteToast(
            data.voter.name,
            data.voter.phone || formatPhone(data.voter.jid),
            data.selectedOption
          );
        }
      }
    };
    const handleChanged = (data) => {
      if (data.pollId === poll.id) fetchData();
    };
    const handleHistorySync = () => fetchData();
    socket.on("connect", handleReconnect);
    socket.on("poll_vote_received", handleVote);
    socket.on("poll_data_changed", handleChanged);
    socket.on("history_sync_complete", handleHistorySync);

    return () => {
      socket.off("connect", handleReconnect);
      socket.off("poll_vote_received", handleVote);
      socket.off("poll_data_changed", handleChanged);
      socket.off("history_sync_complete", handleHistorySync);
      socket.emit("unsubscribe_from_poll", { pollId: poll.id });
    };
  }, [socket, poll?.id, fetchData, showVoteToast]);

  const chartData = votes.map((v) => ({
    name: v.optionText.length > 12 ? v.optionText.substring(0, 12) + "..." : v.optionText,
    fullName: v.optionText,
    votes: v.count,
  }));

  const leading = votes.reduce((best, v) => (v.count > best.count ? v : best), { count: 0, optionText: "-" });

  const allVoters = (() => {
    if (!isMultiSelect) {
      return votes.flatMap((v) =>
        (v.voters || []).map((voter) => {
          const d = voterDisplay(voter);
          return { ...d, options: [{ text: v.optionText, color: COLORS[votes.indexOf(v) % COLORS.length] }], option: v.optionText, optionColor: COLORS[votes.indexOf(v) % COLORS.length] };
        })
      );
    }
    const voterMap = new Map();
    votes.forEach((v, vIdx) => {
      (v.voters || []).forEach((voter) => {
        const d = voterDisplay(voter);
        const key = d.jid || d.phone;
        if (!voterMap.has(key)) {
          voterMap.set(key, { ...d, options: [] });
        }
        voterMap.get(key).options.push({ text: v.optionText, color: COLORS[vIdx % COLORS.length] });
      });
    });
    return Array.from(voterMap.values()).map((v) => ({
      ...v,
      option: v.options.map((o) => o.text).join(", "),
      optionColor: v.options[0]?.color || COLORS[0],
    }));
  })();

  return (
    <div className="space-y-4">
      <VoteSplash splash={voteSplash} />
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0">
            <h2 className="text-lg font-bold truncate">{poll?.title}</h2>
            <p className="text-gray-400 text-xs truncate">{group?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-2 h-2 rounded-full bg-wa-green animate-pulse" />
          <span className="text-xs text-gray-400">Live</span>
          <button onClick={fetchData} className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors" title="Refresh">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          {!isViewer && (
            <button
              onClick={isSharedToViewer ? handleUnshareFromViewer : handleShareToViewer}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isSharedToViewer
                  ? "bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600 animate-pulse"
                  : "bg-wa-green text-white shadow-lg shadow-wa-green/30 hover:bg-emerald-500 hover:shadow-wa-green/50"
              }`}
              title={isSharedToViewer ? "Click to stop sharing" : "Share poll to Viewer screen"}
            >
              {isSharedToViewer ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-white" />
                  On Air
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Share
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className={`grid gap-2 ${isMultiSelect ? "grid-cols-4" : "grid-cols-3"}`}>
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-wa-green">{uniqueVoters}</p>
          <p className="text-[10px] text-gray-500">Voters</p>
        </div>
        {isMultiSelect && (
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-purple-400">{totalVotes}</p>
            <p className="text-[10px] text-gray-500">Selections</p>
          </div>
        )}
        <div className="card p-3 text-center">
          <p className="text-2xl font-bold text-blue-400">{votes.length}</p>
          <p className="text-[10px] text-gray-500">Options</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-sm font-bold text-amber-400 truncate">{leading.optionText}</p>
          <p className="text-[10px] text-gray-500">Leading ({leading.count})</p>
        </div>
      </div>
      {isMultiSelect && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium">
            Multi-Select
          </span>
          <span className="text-[10px] text-gray-500">
            {poll?.selectableCount === 0 ? "Unlimited selections" : `Up to ${poll?.selectableCount} selections`}
          </span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-gray-900 rounded-xl p-1 gap-1">
        {[
          { key: "results", label: "Results", icon: "📊" },
          { key: "voters", label: `Voters (${allVoters.length})`, icon: "👥" },
          { key: "activity", label: "Activity", icon: "⚡" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
              tab === t.key
                ? "bg-wa-green/20 text-wa-green shadow-sm"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Template picker (Admin only) */}
      {tab === "results" && !isViewer && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {TEMPLATES.map((t) => (
              <button
                key={t.key}
                onClick={() => handleTemplateChange(t.key)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 border ${
                  activeTemplate === t.key
                    ? "bg-wa-green/20 text-wa-green border-wa-green/40 shadow-sm"
                    : "bg-gray-800/50 text-gray-400 border-gray-700 hover:text-gray-200 hover:border-gray-500"
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase tracking-widest text-purple-400 font-bold mr-1">Animated</span>
            {ANIMATED_TEMPLATES.map((t) => (
              <button
                key={t.key}
                onClick={() => handleTemplateChange(t.key)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 border ${
                  activeTemplate === t.key
                    ? "bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-500/10"
                    : "bg-gray-800/50 text-gray-400 border-gray-700 hover:text-purple-300 hover:border-purple-500/40"
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results tab */}
      {tab === "results" && renderTemplate(activeTemplate, { votes, chartData, totalVotes, COLORS, allVoters, uniqueVoters, isMultiSelect, pctBase: isMultiSelect ? (uniqueVoters || 1) : (totalVotes || 1) })}

      {/* Voters tab */}
      {tab === "voters" && (
        <div className="card overflow-hidden">
          {allVoters.length === 0 ? (
            <div className="p-6 text-center text-gray-600 text-sm">No voters recorded yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Voter</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Voted For</th>
                  </tr>
                </thead>
                <tbody>
                  {allVoters.map((v, i) => {
                    const displayName = v.name || v.phone;
                    const initial = v.name
                      ? v.name.charAt(0).toUpperCase()
                      : (v.phone.charAt(0) === "+" ? v.phone.charAt(1) : v.phone.charAt(0));
                    return (
                      <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                        <td className="py-2.5 px-4 text-xs text-gray-600">{i + 1}</td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2 relative group cursor-default">
                            <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-400 shrink-0">
                              {initial}
                            </div>
                            <div className="min-w-0">
                              <span className="text-gray-200 text-xs font-medium block truncate">{displayName}</span>
                              {v.name && (
                                <span className="text-[10px] text-gray-500 block">{v.phone}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          {v.options && v.options.length > 1 ? (
                            <div className="flex flex-wrap gap-1">
                              {v.options.map((opt, oi) => (
                                <span key={oi} className="text-xs px-2 py-0.5 rounded-lg font-medium" style={{ backgroundColor: opt.color + "20", color: opt.color }}>
                                  {opt.text}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs px-2 py-1 rounded-lg font-medium" style={{ backgroundColor: v.optionColor + "20", color: v.optionColor }}>
                              {v.option}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Activity tab */}
      {tab === "activity" && (
        <div className="card p-4">
          {voteLog.length === 0 ? (
            <div className="text-center py-6 text-gray-600 text-sm">No activity recorded yet</div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {voteLog.map((log, i) => {
                const logName = log.voterName || formatPhone(log.voterJid);
                return (
                  <div key={log.id} className="flex items-center gap-3 py-2 border-b border-gray-800/50 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-wa-green/20 flex items-center justify-center text-xs font-bold text-wa-green shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-300 truncate">
                        <span className="font-medium" title={log.voterName ? formatPhone(log.voterJid) : ""}>{logName}</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        voted{" "}
                        {log.selectedOptionText ? (
                          log.selectedOptionText.split("|").map((opt, oi) => (
                            <span key={oi}>
                              {oi > 0 && <span className="text-gray-600"> + </span>}
                              <span className="text-wa-green font-medium">{opt}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 italic">retracted</span>
                        )}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-600 shrink-0">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {lastUpdate && (
        <p className="text-center text-[10px] text-gray-600">
          Last update: {lastUpdate.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
