import { useState, useEffect, useCallback, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, RadialBarChart, RadialBar, Legend,
} from "recharts";
import confetti from "canvas-confetti";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

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

const DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

const VOTE_EFFECTS = [
  { key: "none", label: "None", icon: "🔇" },
  { key: "confetti", label: "Confetti", icon: "🎊" },
  { key: "fireworks", label: "Fireworks", icon: "🎆" },
  { key: "hearts", label: "Hearts", icon: "💖" },
  { key: "stars", label: "Stars", icon: "⭐" },
  { key: "snow", label: "Snow", icon: "❄️" },
  { key: "emoji", label: "Emoji Rain", icon: "🎉" },
  { key: "thunder", label: "Thunder", icon: "⚡" },
  { key: "bubbles", label: "Bubbles", icon: "🫧" },
  { key: "spotlight", label: "Spotlight", icon: "🔦" },
  { key: "cannon", label: "Cannon", icon: "💥" },
  { key: "matrix", label: "Matrix", icon: "🟩" },
  { key: "laser", label: "Laser Show", icon: "🔴" },
  { key: "galaxy", label: "Galaxy", icon: "🌌" },
  { key: "wave", label: "Wave", icon: "🌊" },
  { key: "tornado", label: "Tornado", icon: "🌪️" },
  { key: "rainbow", label: "Rainbow", icon: "🌈" },
  { key: "fire", label: "Fire", icon: "🔥" },
  { key: "diamonds", label: "Diamonds", icon: "💎" },
  { key: "applause", label: "Applause", icon: "👏" },
  { key: "flower", label: "Flower Bloom", icon: "🌸" },
  { key: "random", label: "Random", icon: "🎲" },
];

function fireEffect(effectKey) {
  if (effectKey === "random") {
    const pool = VOTE_EFFECTS.filter((e) => e.key !== "none" && e.key !== "random");
    effectKey = pool[Math.floor(Math.random() * pool.length)].key;
  }
  const z = 9999;
  switch (effectKey) {
    case "confetti": {
      const count = 80;
      const defaults = { origin: { y: 0.7 }, zIndex: z };
      confetti({ ...defaults, particleCount: count, spread: 80, startVelocity: 35, colors: ["#25D366", "#34B7F1", "#FFA726", "#FF6B6B", "#AB47BC"] });
      setTimeout(() => confetti({ ...defaults, particleCount: count / 2, spread: 60, startVelocity: 25, origin: { x: 0.3, y: 0.6 }, colors: ["#25D366", "#66BB6A", "#26A69A"] }), 150);
      setTimeout(() => confetti({ ...defaults, particleCount: count / 2, spread: 60, startVelocity: 25, origin: { x: 0.7, y: 0.6 }, colors: ["#34B7F1", "#42A5F5", "#FFA000"] }), 300);
      break;
    }
    case "fireworks": {
      const duration = 1500;
      const end = Date.now() + duration;
      const interval = setInterval(() => {
        if (Date.now() > end) return clearInterval(interval);
        confetti({
          particleCount: 40, spread: 360, startVelocity: 30,
          origin: { x: Math.random(), y: Math.random() * 0.4 },
          colors: ["#FF0000", "#FF7700", "#FFDD00", "#00FF00", "#00DDFF", "#FF00FF"],
          ticks: 60, gravity: 1.2, scalar: 1.2, zIndex: z,
        });
      }, 250);
      break;
    }
    case "hearts": {
      const heart = confetti.shapeFromPath({ path: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" });
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          confetti({
            particleCount: 25, spread: 70, startVelocity: 30,
            origin: { x: 0.2 + Math.random() * 0.6, y: 0.5 + Math.random() * 0.3 },
            colors: ["#FF1744", "#FF4081", "#F50057", "#E91E63", "#FF80AB"],
            shapes: [heart], scalar: 2, zIndex: z, gravity: 0.8, drift: 0,
          });
        }, i * 200);
      }
      break;
    }
    case "stars": {
      const star = confetti.shapeFromPath({ path: "M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01L12 2z" });
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          confetti({
            particleCount: 30, spread: 80, startVelocity: 35,
            origin: { x: 0.3 + i * 0.2, y: 0.6 },
            colors: ["#FFD700", "#FFA000", "#FFE082", "#FFFFFF", "#FFC107"],
            shapes: [star], scalar: 2, zIndex: z, gravity: 0.7, ticks: 100,
          });
        }, i * 180);
      }
      break;
    }
    case "snow": {
      const duration = 2000;
      const end = Date.now() + duration;
      const interval = setInterval(() => {
        if (Date.now() > end) return clearInterval(interval);
        confetti({
          particleCount: 15, spread: 160, startVelocity: 5,
          origin: { x: Math.random(), y: -0.1 },
          colors: ["#FFFFFF", "#E3F2FD", "#BBDEFB", "#90CAF9", "#B3E5FC"],
          ticks: 200, gravity: 0.3, drift: Math.random() * 2 - 1,
          scalar: 1.5, shapes: ["circle"], zIndex: z,
        });
      }, 150);
      break;
    }
    case "emoji": {
      const emojis = ["🎉", "🔥", "💪", "👏", "🙌", "✅", "🏆", "⚡"];
      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          const emojiShape = confetti.shapeFromText({ text: emojis[Math.floor(Math.random() * emojis.length)], scalar: 12 });
          confetti({
            particleCount: 8, spread: 60, startVelocity: 25,
            origin: { x: 0.2 + Math.random() * 0.6, y: 0.5 + Math.random() * 0.3 },
            shapes: [emojiShape], scalar: 3, gravity: 0.6, ticks: 120, zIndex: z,
            flat: true,
          });
        }, i * 200);
      }
      break;
    }
    case "thunder": {
      const bolt = confetti.shapeFromPath({ path: "M13 0L0 13h9l-1 11L21 11h-9l1-11z" });
      confetti({ particleCount: 15, spread: 40, startVelocity: 55, origin: { x: 0.5, y: 0.2 }, colors: ["#FFD600", "#FFFF00", "#FFC107"], shapes: [bolt], scalar: 2.5, gravity: 1.5, ticks: 80, zIndex: z });
      setTimeout(() => {
        confetti({ particleCount: 50, spread: 100, startVelocity: 40, origin: { x: 0.5, y: 0.5 }, colors: ["#FFD600", "#FFA000", "#FFFFFF", "#B388FF"], ticks: 70, gravity: 1, zIndex: z });
      }, 100);
      setTimeout(() => {
        confetti({ particleCount: 10, spread: 30, startVelocity: 50, origin: { x: 0.3, y: 0.3 }, colors: ["#FFD600", "#FFFF00"], shapes: [bolt], scalar: 2, gravity: 1.5, ticks: 60, zIndex: z });
        confetti({ particleCount: 10, spread: 30, startVelocity: 50, origin: { x: 0.7, y: 0.3 }, colors: ["#FFD600", "#FFFF00"], shapes: [bolt], scalar: 2, gravity: 1.5, ticks: 60, zIndex: z });
      }, 300);
      break;
    }
    case "bubbles": {
      const duration = 2000;
      const end = Date.now() + duration;
      const interval = setInterval(() => {
        if (Date.now() > end) return clearInterval(interval);
        confetti({
          particleCount: 8, spread: 120, startVelocity: 8,
          origin: { x: Math.random(), y: 1.0 },
          colors: ["#80DEEA", "#4DD0E1", "#00BCD4", "#B2EBF2", "#E0F7FA", "#FFFFFF"],
          ticks: 250, gravity: -0.15, drift: Math.random() * 1 - 0.5,
          scalar: 2, shapes: ["circle"], zIndex: z,
        });
      }, 120);
      break;
    }
    case "spotlight": {
      confetti({ particleCount: 100, spread: 30, startVelocity: 50, origin: { x: 0.5, y: 1.0 }, colors: ["#FFD700", "#FFC107", "#FFEB3B", "#FFFFFF"], ticks: 100, gravity: 0.8, scalar: 1.5, zIndex: z });
      setTimeout(() => confetti({ particleCount: 60, spread: 20, startVelocity: 45, origin: { x: 0.5, y: 1.0 }, colors: ["#FFD700", "#FFFFFF", "#FFF9C4"], ticks: 90, gravity: 0.7, scalar: 1.2, zIndex: z }), 200);
      setTimeout(() => confetti({ particleCount: 40, spread: 15, startVelocity: 40, origin: { x: 0.5, y: 1.0 }, colors: ["#FFD700", "#FFC107"], ticks: 80, gravity: 0.6, scalar: 1, zIndex: z }), 400);
      break;
    }
    case "cannon": {
      confetti({ particleCount: 60, angle: 60, spread: 50, startVelocity: 55, origin: { x: 0, y: 0.8 }, colors: ["#FF1744", "#FF5252", "#FF8A80", "#FFAB40", "#FFD740"], ticks: 80, zIndex: z });
      confetti({ particleCount: 60, angle: 120, spread: 50, startVelocity: 55, origin: { x: 1, y: 0.8 }, colors: ["#2979FF", "#448AFF", "#82B1FF", "#00E5FF", "#18FFFF"], ticks: 80, zIndex: z });
      setTimeout(() => {
        confetti({ particleCount: 40, angle: 80, spread: 40, startVelocity: 50, origin: { x: 0, y: 0.9 }, colors: ["#76FF03", "#64DD17", "#AEEA00", "#EEFF41"], ticks: 70, zIndex: z });
        confetti({ particleCount: 40, angle: 100, spread: 40, startVelocity: 50, origin: { x: 1, y: 0.9 }, colors: ["#E040FB", "#D500F9", "#AA00FF", "#EA80FC"], ticks: 70, zIndex: z });
      }, 250);
      break;
    }
    case "matrix": {
      const duration = 2000;
      const end = Date.now() + duration;
      const interval = setInterval(() => {
        if (Date.now() > end) return clearInterval(interval);
        confetti({
          particleCount: 12, spread: 180, startVelocity: 15,
          origin: { x: Math.random(), y: -0.1 },
          colors: ["#00FF41", "#00CC33", "#009926", "#33FF66", "#66FF99"],
          ticks: 150, gravity: 0.8, drift: 0,
          scalar: 1.2, shapes: ["square"], zIndex: z,
        });
      }, 80);
      break;
    }
    case "laser": {
      const corners = [
        { x: 0, y: 0 }, { x: 1, y: 0 },
        { x: 0, y: 1 }, { x: 1, y: 1 },
      ];
      const laserColors = [
        ["#FF0000", "#FF4444", "#FF8888"],
        ["#00FF00", "#44FF44", "#88FF88"],
        ["#0088FF", "#44AAFF", "#88CCFF"],
        ["#FF00FF", "#FF44FF", "#FF88FF"],
      ];
      corners.forEach((origin, i) => {
        setTimeout(() => {
          confetti({
            particleCount: 20, spread: 15, startVelocity: 70,
            origin, colors: laserColors[i],
            ticks: 50, gravity: 0.3, scalar: 0.8, zIndex: z,
            angle: i < 2 ? (i === 0 ? 315 : 225) : (i === 2 ? 45 : 135),
          });
        }, i * 100);
      });
      setTimeout(() => {
        confetti({ particleCount: 40, spread: 10, startVelocity: 65, origin: { x: 0.5, y: 0 }, angle: 270, colors: ["#FFFFFF", "#00FFFF", "#FF00FF"], ticks: 60, gravity: 0.5, zIndex: z });
      }, 500);
      break;
    }
    case "galaxy": {
      const arms = 5;
      for (let i = 0; i < arms; i++) {
        const angle = (360 / arms) * i;
        const rad = (angle * Math.PI) / 180;
        const ox = 0.5 + Math.cos(rad) * 0.15;
        const oy = 0.5 + Math.sin(rad) * 0.15;
        setTimeout(() => {
          confetti({
            particleCount: 20, spread: 40, startVelocity: 30,
            origin: { x: ox, y: oy }, angle: angle,
            colors: ["#7C4DFF", "#B388FF", "#E040FB", "#EA80FC", "#CE93D8", "#FFFFFF"],
            ticks: 100, gravity: 0.4, scalar: 1.3, drift: 0.5, zIndex: z,
          });
        }, i * 120);
      }
      setTimeout(() => {
        confetti({
          particleCount: 30, spread: 360, startVelocity: 10,
          origin: { x: 0.5, y: 0.5 },
          colors: ["#FFFFFF", "#E1BEE7", "#F3E5F5"],
          ticks: 120, gravity: 0.1, scalar: 0.8, zIndex: z,
        });
      }, arms * 120 + 100);
      break;
    }
    case "wave": {
      const steps = 8;
      for (let i = 0; i < steps; i++) {
        setTimeout(() => {
          const x = (i + 0.5) / steps;
          const y = 0.5 + Math.sin((i / steps) * Math.PI * 2) * 0.15;
          confetti({
            particleCount: 15, spread: 50, startVelocity: 25,
            origin: { x, y },
            colors: ["#0277BD", "#0288D1", "#039BE5", "#03A9F4", "#29B6F6", "#4FC3F7", "#81D4FA", "#FFFFFF"],
            ticks: 80, gravity: 0.6, scalar: 1.2, zIndex: z,
          });
        }, i * 100);
      }
      break;
    }
    case "tornado": {
      const rings = 6;
      for (let i = 0; i < rings; i++) {
        const radius = 0.25 - i * 0.035;
        const angleOffset = i * 60;
        for (let j = 0; j < 3; j++) {
          const a = ((angleOffset + j * 120) * Math.PI) / 180;
          const ox = 0.5 + Math.cos(a) * radius;
          const oy = 0.5 + Math.sin(a) * radius;
          setTimeout(() => {
            confetti({
              particleCount: 10, spread: 30 + i * 5, startVelocity: 20 + i * 5,
              origin: { x: ox, y: oy },
              colors: ["#78909C", "#90A4AE", "#B0BEC5", "#CFD8DC", "#ECEFF1", "#546E7A"],
              ticks: 60, gravity: 0.5 + i * 0.1, scalar: 1 + i * 0.1, zIndex: z,
            });
          }, i * 80 + j * 30);
        }
      }
      break;
    }
    case "rainbow": {
      const rainbowColors = [
        ["#FF0000"], ["#FF7700"], ["#FFDD00"],
        ["#00CC00"], ["#0066FF"], ["#4400CC"], ["#8800AA"],
      ];
      rainbowColors.forEach((colors, i) => {
        setTimeout(() => {
          const angle = 150 - i * 10;
          confetti({
            particleCount: 18, spread: 15, startVelocity: 40 + i * 3,
            origin: { x: 0.1 + i * 0.02, y: 0.9 },
            colors, angle,
            ticks: 90, gravity: 0.7, scalar: 1.3, zIndex: z,
          });
          confetti({
            particleCount: 18, spread: 15, startVelocity: 40 + i * 3,
            origin: { x: 0.9 - i * 0.02, y: 0.9 },
            colors, angle: 180 - angle + 180,
            ticks: 90, gravity: 0.7, scalar: 1.3, zIndex: z,
          });
        }, i * 80);
      });
      break;
    }
    case "fire": {
      const duration = 1800;
      const end = Date.now() + duration;
      const interval = setInterval(() => {
        if (Date.now() > end) return clearInterval(interval);
        const x = 0.3 + Math.random() * 0.4;
        confetti({
          particleCount: 10, spread: 40, startVelocity: 30,
          origin: { x, y: 1.0 }, angle: 90,
          colors: ["#FF6D00", "#FF9100", "#FFAB00", "#FFD600", "#DD2C00", "#FF3D00"],
          ticks: 70, gravity: 0.4, scalar: 1.5, drift: (Math.random() - 0.5) * 0.5,
          zIndex: z,
        });
      }, 80);
      break;
    }
    case "diamonds": {
      const diamond = confetti.shapeFromPath({ path: "M12 2L2 12l10 10 10-10L12 2z" });
      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          confetti({
            particleCount: 12, spread: 140, startVelocity: 15,
            origin: { x: Math.random(), y: -0.1 },
            colors: ["#B3E5FC", "#E1F5FE", "#FFFFFF", "#80DEEA", "#4DD0E1", "#00BCD4"],
            shapes: [diamond], scalar: 2, gravity: 0.5,
            drift: Math.random() - 0.5, ticks: 150, zIndex: z,
          });
        }, i * 200);
      }
      setTimeout(() => {
        confetti({
          particleCount: 20, spread: 100, startVelocity: 20,
          origin: { x: 0.5, y: 0.5 },
          colors: ["#FFFFFF", "#E0F7FA", "#B2EBF2"],
          shapes: [diamond], scalar: 2.5, gravity: 0.3, ticks: 100, zIndex: z,
        });
      }, 900);
      break;
    }
    case "applause": {
      const hands = ["👏", "🙌", "👐", "🤲"];
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          const shape = confetti.shapeFromText({ text: hands[i % hands.length], scalar: 12 });
          confetti({
            particleCount: 6, spread: 80, startVelocity: 25,
            origin: { x: 0.15 + Math.random() * 0.7, y: 0.6 + Math.random() * 0.3 },
            shapes: [shape], scalar: 3, gravity: 0.7, ticks: 100, zIndex: z,
            flat: true,
          });
        }, i * 150);
      }
      break;
    }
    case "flower": {
      const petals = ["🌸", "🌺", "🌷", "🌹", "🏵️", "💐"];
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          const shape = confetti.shapeFromText({ text: petals[i % petals.length], scalar: 12 });
          confetti({
            particleCount: 8, spread: 360, startVelocity: 20 + i * 5,
            origin: { x: 0.5, y: 0.5 },
            shapes: [shape], scalar: 3, gravity: 0.4, ticks: 130, zIndex: z,
            flat: true, drift: Math.random() - 0.5,
          });
        }, i * 180);
      }
      break;
    }
    case "none":
    default:
      break;
  }
}

const SPLASH_SHAPES = ["circle", "card", "diamond", "hexagon", "star"];

function SplashBubble({ splash }) {
  const displayName = splash.voterName || splash.voterPhone || "Someone";
  const choices = (splash.selectedOption || "").split("|").filter(Boolean);
  const s = splash.shape || "circle";

  const nameLen = displayName.length;
  const circleSize = Math.max(70, Math.min(160, 50 + nameLen * 7));
  const circleFontSize = Math.max(11, Math.min(22, 22 - nameLen * 0.5));
  const choiceFontSize = Math.max(12, Math.min(18, 18 - nameLen * 0.3));

  const choiceBlock = (
    <div className="flex flex-wrap justify-center gap-1 mt-0.5">
      {choices.map((opt, i) => (
        <span key={i} className="font-black text-wa-green drop-shadow-[0_0_12px_rgba(37,211,102,0.6)]" style={{ fontSize: choiceFontSize }}>
          {opt}
        </span>
      ))}
    </div>
  );

  let inner;
  if (s === "circle") {
    inner = (
      <>
        <div
          className="mx-auto mb-1.5 rounded-full bg-wa-green/20 border-3 border-wa-green/50 flex items-center justify-center font-bold text-wa-green shadow-xl shadow-wa-green/30 animate-bounce-in p-2"
          style={{ width: circleSize, height: circleSize, fontSize: circleFontSize }}
        >
          <span className="text-center leading-tight break-words max-w-[90%]">{displayName}</span>
        </div>
        <p className="text-[10px] text-gray-400 font-medium tracking-wider uppercase mb-0.5">voted for</p>
        {choiceBlock}
      </>
    );
  } else if (s === "card") {
    inner = (
      <div className="relative inline-block">
        <div className="absolute inset-0 bg-black/60 rounded-xl blur-lg scale-110" />
        <div className="relative bg-gradient-to-br from-gray-900/95 to-gray-800/95 border-2 border-wa-green/60 rounded-xl px-5 py-3 shadow-[0_0_30px_rgba(37,211,102,0.3)]">
          <p className="font-black text-white mb-0.5 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" style={{ fontSize: circleFontSize + 2 }}>{displayName}</p>
          <p className="text-[10px] text-gray-400 font-medium tracking-wider uppercase mb-1">voted for</p>
          {choiceBlock}
        </div>
      </div>
    );
  } else if (s === "diamond") {
    inner = (
      <>
        <div
          className="mx-auto mb-2 bg-gradient-to-br from-purple-600/30 to-cyan-500/30 border-2 border-cyan-400/60 flex items-center justify-center font-bold text-cyan-300 shadow-xl shadow-cyan-500/30 animate-bounce-in p-2"
          style={{ width: circleSize, height: circleSize, fontSize: circleFontSize, transform: "rotate(45deg)", borderRadius: "12px" }}
        >
          <span className="text-center leading-tight break-words max-w-[90%]" style={{ transform: "rotate(-45deg)" }}>{displayName}</span>
        </div>
        <p className="text-[10px] text-gray-400 font-medium tracking-wider uppercase mb-0.5">voted for</p>
        {choiceBlock}
      </>
    );
  } else if (s === "hexagon") {
    inner = (
      <>
        <div className="mx-auto mb-1.5 relative flex items-center justify-center animate-bounce-in" style={{ width: circleSize + 10, height: circleSize + 10 }}>
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
            <polygon points="50,2 93,25 93,75 50,98 7,75 7,25" fill="rgba(37,211,102,0.15)" stroke="rgba(37,211,102,0.6)" strokeWidth="2" />
          </svg>
          <span className="relative text-center leading-tight break-words text-wa-green font-bold px-3" style={{ fontSize: circleFontSize }}>{displayName}</span>
        </div>
        <p className="text-[10px] text-gray-400 font-medium tracking-wider uppercase mb-0.5">voted for</p>
        {choiceBlock}
      </>
    );
  } else if (s === "star") {
    inner = (
      <>
        <div className="mx-auto mb-1.5 relative flex items-center justify-center animate-bounce-in" style={{ width: circleSize + 15, height: circleSize + 15 }}>
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
            <polygon points="50,5 61,35 95,35 68,57 79,90 50,70 21,90 32,57 5,35 39,35" fill="rgba(255,215,0,0.15)" stroke="rgba(255,215,0,0.6)" strokeWidth="2" />
          </svg>
          <span className="relative text-center leading-tight break-words text-yellow-300 font-bold px-4" style={{ fontSize: circleFontSize }}>{displayName}</span>
        </div>
        <p className="text-[10px] text-gray-400 font-medium tracking-wider uppercase mb-0.5">voted for</p>
        {choiceBlock}
      </>
    );
  }

  return (
    <div
      className="absolute pointer-events-none animate-vote-splash text-center"
      style={{ left: `${splash.posX}%`, top: `${splash.posY}%`, transform: "translate(-50%, -50%)" }}
    >
      {inner}
    </div>
  );
}

function VoteSplash({ splashes }) {
  if (!splashes || splashes.length === 0) return null;
  return (
    <div className="fixed inset-0 z-[10000] pointer-events-none">
      {splashes.map((sp) => (
        <SplashBubble key={sp.id} splash={sp} />
      ))}
    </div>
  );
}

const TEMPLATES = [
  { key: "classic", label: "Classic", icon: "📊" },
  { key: "pie", label: "Pie", icon: "🍩" },
  { key: "donut", label: "Donut", icon: "🔘" },
  { key: "bars", label: "Bars", icon: "📶" },
  { key: "hbars", label: "H-Bars", icon: "📊" },
  { key: "stacked", label: "Stacked", icon: "📚" },
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
  { key: "treemap", label: "Treemap", icon: "🗺️" },
  { key: "wordcloud", label: "Word Cloud", icon: "☁️" },
  { key: "thermometer", label: "Thermometer", icon: "🌡️" },
  { key: "rings", label: "Progress Rings", icon: "⭕" },
  { key: "heatmap", label: "Heatmap", icon: "🟥" },
  { key: "scoreboard", label: "Scoreboard", icon: "🔢" },
  { key: "bracket", label: "Bracket", icon: "🏅" },
  { key: "countdown", label: "Countdown", icon: "✈️" },
  { key: "leaderboard", label: "Leaderboard", icon: "📋" },
];

const ANIMATED_TEMPLATES = [
  { key: "pulse", label: "Pulse Wave", icon: "💫" },
  { key: "slots", label: "Slot Machine", icon: "🎰" },
  { key: "particles", label: "Particles", icon: "✨" },
  { key: "bigscreen", label: "Big Screen", icon: "🖥️" },
  { key: "horserace", label: "Horse Race", icon: "🏇" },
  { key: "balloon", label: "Balloon Rise", icon: "🎈" },
  { key: "tugofwar", label: "Tug of War", icon: "🪢" },
  { key: "carrace", label: "Car Race", icon: "🏎️" },
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
    </div>
  );
}

function TemplatePie({ chartData, totalVotes, COLORS: colors, uniqueVoters, isMultiSelect, pctBase }) {
  if (chartData.length === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
  const hasVotes = totalVotes > 0;
  const pieData = hasVotes
    ? chartData.filter((d) => d.votes > 0).map((d, i) => ({ ...d, fill: colors[chartData.indexOf(d) % colors.length] }))
    : chartData.map((d, i) => ({ ...d, votes: 1, fill: colors[i % colors.length] }));
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
  if (chartData.length === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
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
  if (chartData.length === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
  const hasVotes = totalVotes > 0;
  const radialData = hasVotes
    ? chartData.filter((d) => d.votes > 0).map((d, i) => ({ ...d, fill: colors[chartData.indexOf(d) % colors.length] }))
    : chartData.map((d, i) => ({ ...d, votes: 1, fill: colors[i % colors.length] }));
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
  if (sorted.length === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
  const max = sorted[0].count || 1;
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
  const sorted = [...votes].sort((a, b) => b.count - a.count);
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
  if (sorted.length === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;

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
  if (votes.length === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
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
  if (votes.length === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
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
  if (votes.length === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
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
  if (votes.length === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
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
  if (votes.length === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
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
  const sorted = [...votes].sort((a, b) => b.count - a.count);
  if (sorted.length === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
  const max = sorted[0].count || 1;
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
  if (votes.length === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
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

function TemplateTreemap({ votes, totalVotes, COLORS: colors, pctBase, isMultiSelect, uniqueVoters }) {
  if (votes.length === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
  const sorted = [...votes].sort((a, b) => b.count - a.count);
  const total = pctBase || 1;
  return (
    <div className="card p-4 space-y-3">
      <div className="flex flex-wrap gap-1.5" style={{ minHeight: 280 }}>
        {sorted.map((v, idx) => {
          const origIdx = votes.indexOf(v);
          const color = colors[origIdx % colors.length];
          const pct = (v.count / total) * 100;
          const area = Math.max(pct, 5);
          return (
            <div
              key={v.optionId || idx}
              className="rounded-lg flex flex-col items-center justify-center text-center p-2 transition-all duration-700 relative overflow-hidden"
              style={{
                flexBasis: `${Math.max(area - 1, 8)}%`,
                flexGrow: area,
                minHeight: 80,
                background: `linear-gradient(135deg, ${color}30, ${color}10)`,
                border: `2px solid ${color}55`,
              }}
            >
              <span className="text-2xl md:text-3xl font-black" style={{ color }}>{v.count}</span>
              <span className="text-[10px] md:text-xs font-bold text-gray-200 truncate max-w-full mt-1">{v.optionText}</span>
              <span className="text-[9px] text-gray-500">{pct.toFixed(0)}%</span>
            </div>
          );
        })}
      </div>
      <p className="text-center text-xs text-gray-500">{isMultiSelect ? `${uniqueVoters} voters · ${totalVotes} selections` : `${totalVotes} total votes`}</p>
    </div>
  );
}

function TemplateDonut({ chartData, totalVotes, COLORS: colors, uniqueVoters, isMultiSelect, pctBase }) {
  if (chartData.length === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
  const hasVotes = totalVotes > 0;
  const pieData = hasVotes
    ? chartData.filter((d) => d.votes > 0).map((d) => ({ ...d, fill: colors[chartData.indexOf(d) % colors.length] }))
    : chartData.map((d, i) => ({ ...d, votes: 1, fill: colors[i % colors.length] }));
  return (
    <div className="card p-6">
      <div className="relative">
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie data={pieData} dataKey="votes" nameKey="fullName" cx="50%" cy="50%" innerRadius={90} outerRadius={140} paddingAngle={2} animationDuration={800} labelLine={false}>
              {pieData.map((entry, idx) => (<Cell key={idx} fill={entry.fill} />))}
            </Pie>
            <Tooltip contentStyle={{ background: "#1F2937", border: "1px solid #374151", borderRadius: "12px", color: "#F9FAFB", fontSize: "12px" }} formatter={(value) => [`${value} votes`]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-4xl md:text-5xl font-black text-white">{isMultiSelect ? uniqueVoters : totalVotes}</span>
          <span className="text-xs text-gray-400">{isMultiSelect ? "voters" : "votes"}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mt-2">
        {chartData.map((d, idx) => {
          const color = colors[idx % colors.length];
          const pct = pctBase > 0 ? (d.votes / pctBase * 100).toFixed(0) : 0;
          return (
            <div key={idx} className="flex items-center gap-1.5 text-xs">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-gray-300">{d.fullName}</span>
              <span className="text-gray-500">{d.votes} ({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TemplateHorizontalBars({ votes, totalVotes, COLORS: colors, pctBase }) {
  if (votes.length === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
  const max = Math.max(...votes.map((v) => v.count), 1);
  return (
    <div className="card p-5 space-y-3">
      {votes.map((v, idx) => {
        const color = colors[idx % colors.length];
        const barW = max > 0 ? (v.count / max) * 100 : 0;
        const pct = pctBase > 0 ? (v.count / pctBase) * 100 : 0;
        return (
          <div key={v.optionId || idx} className="flex items-center gap-3">
            <span className="text-xs md:text-sm font-bold text-gray-300 w-24 md:w-32 text-right truncate">{v.optionText}</span>
            <div className="flex-1 bg-gray-800 rounded-full h-7 overflow-hidden relative">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-2"
                style={{ width: `${Math.max(barW, 3)}%`, backgroundColor: color }}
              >
                {barW > 20 && <span className="text-xs font-bold text-white/90">{v.count}</span>}
              </div>
            </div>
            {barW <= 20 && <span className="text-sm font-bold shrink-0" style={{ color }}>{v.count}</span>}
            <span className="text-xs text-gray-500 shrink-0 w-10 text-right">{pct.toFixed(0)}%</span>
          </div>
        );
      })}
    </div>
  );
}

function TemplateStacked({ votes, totalVotes, COLORS: colors, pctBase, isMultiSelect, uniqueVoters }) {
  if (votes.length === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
  return (
    <div className="card p-6 space-y-4">
      <div className="w-full bg-gray-800 rounded-xl h-16 md:h-20 overflow-hidden flex">
        {votes.map((v, idx) => {
          const color = colors[idx % colors.length];
          const pct = pctBase > 0 ? (v.count / pctBase) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={v.optionId || idx}
              className="h-full flex items-center justify-center transition-all duration-700 relative overflow-hidden"
              style={{ width: `${pct}%`, backgroundColor: color, minWidth: v.count > 0 ? 20 : 0 }}
              title={`${v.optionText}: ${v.count} (${pct.toFixed(0)}%)`}
            >
              {pct > 8 && <span className="text-xs md:text-sm font-black text-white truncate px-1">{v.count}</span>}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
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

function TemplateWordCloud({ votes, totalVotes, COLORS: colors, pctBase }) {
  if (votes.length === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
  const max = Math.max(...votes.map((v) => v.count), 1);
  const shuffled = [...votes].sort(() => Math.random() - 0.5);
  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 min-h-[250px] py-4">
        {shuffled.map((v, idx) => {
          const origIdx = votes.indexOf(v);
          const color = colors[origIdx % colors.length];
          const ratio = max > 0 ? v.count / max : 0;
          const fontSize = Math.max(12, Math.round(14 + ratio * 40));
          const opacity = 0.4 + ratio * 0.6;
          return (
            <span
              key={v.optionId || idx}
              className="font-black transition-all duration-500 cursor-default hover:scale-110"
              style={{ fontSize, color, opacity, textShadow: `0 0 ${ratio * 20}px ${color}44` }}
              title={`${v.optionText}: ${v.count} votes`}
            >
              {v.optionText}
              <sup className="text-[10px] ml-0.5 font-normal text-gray-500">{v.count}</sup>
            </span>
          );
        })}
      </div>
      <p className="text-center text-xs text-gray-500 mt-2">{totalVotes} total votes</p>
    </div>
  );
}

function TemplateThermometer({ votes, totalVotes, COLORS: colors, pctBase }) {
  if (votes.length === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
  const max = Math.max(...votes.map((v) => v.count), 1);
  return (
    <div className="card p-5">
      <div className="flex items-end justify-center gap-4 md:gap-6" style={{ minHeight: 300 }}>
        {votes.map((v, idx) => {
          const color = colors[idx % colors.length];
          const fillPct = max > 0 ? (v.count / max) * 100 : 0;
          const pct = pctBase > 0 ? (v.count / pctBase) * 100 : 0;
          return (
            <div key={v.optionId || idx} className="flex flex-col items-center gap-2" style={{ width: `${Math.max(100 / votes.length, 14)}%`, maxWidth: 80 }}>
              <span className="text-sm font-black" style={{ color }}>{v.count}</span>
              <div className="w-full bg-gray-800 rounded-full relative overflow-hidden" style={{ height: 200 }}>
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-full transition-all duration-700"
                  style={{ height: `${Math.max(fillPct, 3)}%`, backgroundColor: color, boxShadow: `inset 0 0 15px ${color}44, 0 0 8px ${color}33` }}
                />
              </div>
              <div className="w-6 h-6 rounded-full shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}66` }} />
              <span className="text-[10px] md:text-xs font-bold text-gray-300 text-center truncate w-full">{v.optionText}</span>
              <span className="text-[9px] text-gray-500">{pct.toFixed(0)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TemplateProgressRings({ votes, totalVotes, COLORS: colors, pctBase, isMultiSelect, uniqueVoters }) {
  if (votes.length === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="card p-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {votes.map((v, idx) => {
          const color = colors[idx % colors.length];
          const pct = pctBase > 0 ? (v.count / pctBase) * 100 : 0;
          const offset = circumference - (pct / 100) * circumference;
          return (
            <div key={v.optionId || idx} className="flex flex-col items-center">
              <svg width="100" height="100" viewBox="0 0 100 100" className="transform -rotate-90">
                <circle cx="50" cy="50" r={radius} fill="none" stroke="#1F2937" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={circumference} strokeDashoffset={offset}
                  className="transition-all duration-700"
                  style={{ filter: `drop-shadow(0 0 4px ${color}66)` }}
                />
              </svg>
              <div className="flex flex-col items-center -mt-16 relative z-10">
                <span className="text-xl font-black" style={{ color }}>{v.count}</span>
                <span className="text-[9px] text-gray-500">{pct.toFixed(0)}%</span>
              </div>
              <span className="text-xs font-bold text-gray-300 mt-4 truncate max-w-full text-center">{v.optionText}</span>
            </div>
          );
        })}
      </div>
      <p className="text-center text-xs text-gray-500 mt-4">{isMultiSelect ? `${uniqueVoters} voters` : `${totalVotes} votes`}</p>
    </div>
  );
}

function TemplateHeatmap({ votes, totalVotes, COLORS: colors, pctBase }) {
  if (votes.length === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
  const max = Math.max(...votes.map((v) => v.count), 1);
  const cols = Math.min(votes.length, 4);
  return (
    <div className="card p-5 space-y-3">
      <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {votes.map((v, idx) => {
          const intensity = max > 0 ? v.count / max : 0;
          const pct = pctBase > 0 ? (v.count / pctBase) * 100 : 0;
          const r = Math.round(30 + intensity * 225);
          const g = Math.round(30 + (1 - intensity) * 60);
          const b = Math.round(30 + (1 - intensity) * 40);
          const bg = `rgb(${r}, ${g}, ${b})`;
          return (
            <div
              key={v.optionId || idx}
              className="rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all duration-700"
              style={{ backgroundColor: bg, minHeight: 100, boxShadow: intensity > 0.5 ? `0 0 ${intensity * 20}px rgba(${r},${g},${b},0.4)` : "none" }}
            >
              <span className="text-2xl md:text-3xl font-black text-white">{v.count}</span>
              <span className="text-xs font-bold text-white/80 truncate max-w-full mt-1">{v.optionText}</span>
              <span className="text-[10px] text-white/50">{pct.toFixed(0)}%</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-1 mt-2">
        <span className="text-[10px] text-gray-500">Low</span>
        <div className="flex gap-0.5">
          {[0.1, 0.3, 0.5, 0.7, 0.9].map((i) => (
            <div key={i} className="w-6 h-3 rounded-sm" style={{ backgroundColor: `rgb(${Math.round(30 + i * 225)}, ${Math.round(30 + (1-i)*60)}, ${Math.round(30 + (1-i)*40)})` }} />
          ))}
        </div>
        <span className="text-[10px] text-gray-500">High</span>
      </div>
    </div>
  );
}

function TemplateScoreboard({ votes, totalVotes, COLORS: colors, pctBase, isMultiSelect, uniqueVoters }) {
  if (votes.length === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
  const sorted = [...votes].sort((a, b) => b.count - a.count);
  return (
    <div className="card p-0 overflow-hidden" style={{ background: "#0a0a0a" }}>
      <div className="text-center py-3 border-b border-gray-800" style={{ background: "linear-gradient(90deg, #1a1a2e, #16213e, #1a1a2e)" }}>
        <p className="text-xs uppercase tracking-[0.4em] font-black text-amber-400" style={{ fontFamily: "'Courier New', monospace" }}>SCOREBOARD</p>
      </div>
      <div className="p-3 space-y-1">
        {sorted.map((v, idx) => {
          const origIdx = votes.indexOf(v);
          const color = colors[origIdx % colors.length];
          const pct = pctBase > 0 ? (v.count / pctBase) * 100 : 0;
          return (
            <div
              key={v.optionId || idx}
              className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all"
              style={{ background: idx === 0 ? `linear-gradient(90deg, ${color}15, transparent)` : "transparent", fontFamily: "'Courier New', monospace" }}
            >
              <span className="text-lg font-black w-8 text-center" style={{ color: idx < 3 ? color : "#6B7280" }}>{idx + 1}.</span>
              <span className="flex-1 text-sm font-bold text-gray-200 truncate">{v.optionText}</span>
              <div className="flex gap-1 shrink-0">
                {String(v.count).padStart(3, "0").split("").map((digit, di) => (
                  <span
                    key={di}
                    className="w-7 h-9 rounded flex items-center justify-center text-lg font-black"
                    style={{ backgroundColor: "#1a1a2e", color, border: `1px solid ${color}33`, textShadow: `0 0 8px ${color}88` }}
                  >
                    {digit}
                  </span>
                ))}
              </div>
              <span className="text-[10px] text-gray-500 w-10 text-right">{pct.toFixed(0)}%</span>
            </div>
          );
        })}
      </div>
      <div className="border-t border-gray-800 px-4 py-2 flex justify-between text-[10px] text-gray-600" style={{ fontFamily: "'Courier New', monospace" }}>
        <span>{isMultiSelect ? `${uniqueVoters} PLR` : `${totalVotes} TOTAL`}</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />LIVE</span>
      </div>
    </div>
  );
}

function TemplateBracket({ votes, totalVotes, COLORS: colors, pctBase }) {
  if (votes.length === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
  const sorted = [...votes].sort((a, b) => b.count - a.count);
  const pairs = [];
  for (let i = 0; i < sorted.length; i += 2) {
    pairs.push(sorted.slice(i, i + 2));
  }
  const winner = sorted[0];
  const winnerOrigIdx = votes.indexOf(winner);
  return (
    <div className="card p-5 space-y-4">
      <p className="text-center text-[10px] uppercase tracking-[0.3em] text-gray-500 font-bold">Tournament Bracket</p>
      <div className="flex items-center gap-4 md:gap-8">
        <div className="flex-1 space-y-3">
          {pairs.map((pair, pi) => (
            <div key={pi} className="space-y-1 rounded-xl p-2" style={{ background: "rgba(31,41,55,0.3)" }}>
              {pair.map((v, vi) => {
                const origIdx = votes.indexOf(v);
                const color = colors[origIdx % colors.length];
                const pct = pctBase > 0 ? (v.count / pctBase) * 100 : 0;
                const isWinning = pair.length === 2 ? v.count >= pair[1 - vi].count : true;
                return (
                  <div
                    key={v.optionId || vi}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
                    style={{
                      background: isWinning ? `linear-gradient(90deg, ${color}18, transparent)` : "transparent",
                      border: `1px solid ${isWinning ? color + "44" : "#374151"}`,
                    }}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className={`text-xs md:text-sm flex-1 truncate ${isWinning ? "font-bold text-white" : "text-gray-500"}`}>{v.optionText}</span>
                    <span className="text-sm font-black" style={{ color }}>{v.count}</span>
                    <span className="text-[9px] text-gray-500">({pct.toFixed(0)}%)</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="shrink-0 flex flex-col items-center gap-2 px-4 py-4 rounded-xl" style={{ background: `linear-gradient(135deg, ${colors[winnerOrigIdx % colors.length]}15, transparent)`, border: `2px solid ${colors[winnerOrigIdx % colors.length]}44` }}>
          <span className="text-2xl">🏆</span>
          <span className="text-sm font-black text-white text-center">{winner.optionText}</span>
          <span className="text-2xl font-black" style={{ color: colors[winnerOrigIdx % colors.length] }}>{winner.count}</span>
        </div>
      </div>
    </div>
  );
}

function TemplateCountdownBoard({ votes, totalVotes, COLORS: colors, pctBase, isMultiSelect, uniqueVoters }) {
  if (votes.length === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
  const sorted = [...votes].sort((a, b) => b.count - a.count);
  return (
    <div className="card p-0 overflow-hidden" style={{ background: "linear-gradient(180deg, #0c0c1d 0%, #111827 100%)" }}>
      <div className="text-center py-3 border-b border-gray-800/50">
        <p className="text-[10px] uppercase tracking-[0.4em] text-cyan-400 font-bold">Departure Board</p>
      </div>
      <div className="p-3 space-y-1">
        {sorted.map((v, idx) => {
          const origIdx = votes.indexOf(v);
          const color = colors[origIdx % colors.length];
          const pct = pctBase > 0 ? (v.count / pctBase) * 100 : 0;
          return (
            <div
              key={v.optionId || idx}
              className="flex items-center gap-2 px-2 py-2 rounded transition-all"
              style={{ fontFamily: "'Courier New', monospace", background: idx % 2 === 0 ? "rgba(31,41,55,0.3)" : "transparent" }}
            >
              <span className="text-xs font-black w-6 text-center" style={{ color: idx < 3 ? "#fbbf24" : "#6B7280" }}>{idx + 1}</span>
              <span className="flex-1 text-xs md:text-sm font-bold text-gray-200 truncate uppercase">{v.optionText}</span>
              <div className="flex gap-0.5 shrink-0">
                {String(v.count).split("").map((d, di) => (
                  <span key={di} className="w-5 h-7 md:w-6 md:h-8 rounded-sm flex items-center justify-center text-sm md:text-base font-black bg-gray-900 border border-gray-700 text-amber-400" style={{ textShadow: "0 0 6px rgba(251,191,36,0.5)" }}>
                    {d}
                  </span>
                ))}
              </div>
              <span className="text-[9px] text-gray-500 w-9 text-right">{pct.toFixed(0)}%</span>
            </div>
          );
        })}
      </div>
      <div className="border-t border-gray-800/50 px-4 py-2 flex justify-between text-[10px] text-gray-600" style={{ fontFamily: "'Courier New', monospace" }}>
        <span>{isMultiSelect ? `${uniqueVoters} voters` : `${totalVotes} votes`}</span>
        <span className="text-cyan-400/60">UPDATING...</span>
      </div>
    </div>
  );
}

function TemplateLeaderboard({ votes, totalVotes, COLORS: colors, pctBase, isMultiSelect, uniqueVoters }) {
  if (votes.length === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
  const sorted = [...votes].sort((a, b) => b.count - a.count);
  const max = sorted[0].count || 1;
  const rankIcons = ["👑", "🥈", "🥉"];
  return (
    <div className="card p-4 space-y-2">
      {sorted.map((v, idx) => {
        const origIdx = votes.indexOf(v);
        const color = colors[origIdx % colors.length];
        const pct = pctBase > 0 ? (v.count / pctBase) * 100 : 0;
        const barW = max > 0 ? (v.count / max) * 100 : 0;
        return (
          <div
            key={v.optionId || idx}
            className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-500"
            style={{ background: idx === 0 ? `linear-gradient(90deg, ${color}12, transparent)` : "transparent", border: `1px solid ${idx === 0 ? color + "33" : "transparent"}` }}
          >
            <span className="text-lg w-8 text-center shrink-0">{rankIcons[idx] || <span className="text-sm font-bold text-gray-600">{idx + 1}</span>}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-bold truncate ${idx === 0 ? "text-white" : "text-gray-300"}`}>{v.optionText}</span>
                <span className="text-base font-black shrink-0 ml-2" style={{ color }}>{v.count} <span className="text-[10px] text-gray-500 font-normal">({pct.toFixed(0)}%)</span></span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${barW}%`, backgroundColor: color }} />
              </div>
            </div>
          </div>
        );
      })}
      <p className="text-center text-xs text-gray-500 pt-2">{isMultiSelect ? `${uniqueVoters} voters · ${totalVotes} selections` : `${totalVotes} total votes`}</p>
    </div>
  );
}

function TemplatePulse({ votes, totalVotes, COLORS: colors, pctBase }) {
  if (votes.length === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
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
  if (votes.length === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
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
  if (votes.length === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
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
  if (votes.length === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
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

function TemplateHorseRace({ votes, totalVotes, COLORS: colors, pctBase }) {
  if (votes.length === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
  const max = Math.max(...votes.map((v) => v.count), 1);
  const animals = ["🐎", "🦊", "🐆", "🐂", "🦁", "🐺", "🦌", "🐘", "🦅", "🐕"];
  const sorted = [...votes].sort((a, b) => b.count - a.count);
  return (
    <div className="card p-0 overflow-hidden" style={{ background: "linear-gradient(180deg, #0f1a0f 0%, #111827 100%)" }}>
      <div className="text-center py-3 border-b border-green-900/30">
        <p className="text-xs font-black tracking-wider text-green-400">🏇 HORSE RACE 🏇</p>
      </div>
      <div className="p-4 space-y-3">
        {sorted.map((v, idx) => {
          const origIdx = votes.indexOf(v);
          const color = colors[origIdx % colors.length];
          const pct = pctBase > 0 ? (v.count / pctBase) * 100 : 0;
          const trackW = max > 0 ? (v.count / max) * 100 : 0;
          const animal = animals[origIdx % animals.length];
          return (
            <div key={v.optionId || idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-300">{v.optionText}</span>
                <span className="font-black" style={{ color }}>{v.count} <span className="text-gray-500 font-normal">({pct.toFixed(0)}%)</span></span>
              </div>
              <div className="w-full bg-green-900/20 rounded-full h-8 overflow-hidden relative border border-green-900/30">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 9.8%, #ffffff10 10%, #ffffff10 10.2%)" }} />
                <div className="h-full transition-all duration-1000 ease-out flex items-center justify-end relative" style={{ width: `${Math.max(trackW, 5)}%` }}>
                  <span className="text-xl md:text-2xl relative z-10 animate-bounce" style={{ animationDuration: "0.6s" }}>{animal}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-green-900/30 px-4 py-2 flex justify-between text-[10px] text-green-400/50">
        <span>START</span>
        <span>{totalVotes} laps</span>
        <span>FINISH 🏁</span>
      </div>
    </div>
  );
}

function TemplateBalloonRise({ votes, totalVotes, COLORS: colors, pctBase, isMultiSelect, uniqueVoters }) {
  if (votes.length === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
  const max = Math.max(...votes.map((v) => v.count), 1);
  return (
    <div className="card p-5 relative overflow-hidden" style={{ minHeight: 350, background: "linear-gradient(180deg, #0c1929 0%, #1a2744 50%, #2d3748 100%)" }}>
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-green-800/40 via-green-700/40 to-green-800/40" />
      <div className="flex items-end justify-center gap-4 md:gap-6" style={{ minHeight: 300 }}>
        {votes.map((v, idx) => {
          const color = colors[idx % colors.length];
          const ratio = max > 0 ? v.count / max : 0;
          const pct = pctBase > 0 ? (v.count / pctBase) * 100 : 0;
          const bottomOffset = ratio * 220;
          return (
            <div
              key={v.optionId || idx}
              className="flex flex-col items-center transition-all duration-1000 relative"
              style={{ transform: `translateY(-${bottomOffset}px)`, width: `${Math.max(100 / votes.length, 14)}%`, maxWidth: 100 }}
            >
              <span className="text-3xl md:text-4xl" style={{ filter: `drop-shadow(0 0 8px ${color}88)` }}>🎈</span>
              <div className="w-px h-4" style={{ backgroundColor: `${color}66` }} />
              <div className="rounded-lg px-2 py-1 text-center" style={{ background: `${color}22`, border: `1px solid ${color}44` }}>
                <span className="text-sm font-black" style={{ color }}>{v.count}</span>
                <span className="block text-[9px] text-gray-400 truncate max-w-[70px]">{v.optionText}</span>
                <span className="text-[8px] text-gray-500">{pct.toFixed(0)}%</span>
              </div>
            </div>
          );
        })}
      </div>
      <p className="absolute bottom-3 left-0 right-0 text-center text-[10px] text-gray-600">
        {isMultiSelect ? `${uniqueVoters} voters` : `${totalVotes} votes`} · higher = more votes
      </p>
    </div>
  );
}

function TemplateTugOfWar({ votes, totalVotes, COLORS: colors, pctBase }) {
  if (votes.length < 2) return <TemplateRace votes={votes} totalVotes={totalVotes} COLORS={colors} pctBase={pctBase} />;
  const sorted = [...votes].sort((a, b) => b.count - a.count);
  const a = sorted[0];
  const b = sorted[1];
  const aIdx = votes.indexOf(a);
  const bIdx = votes.indexOf(b);
  const aColor = colors[aIdx % colors.length];
  const bColor = colors[bIdx % colors.length];
  const total = a.count + b.count || 1;
  const aRatio = a.count / total;
  const aPct = pctBase > 0 ? (a.count / pctBase) * 100 : 0;
  const bPct = pctBase > 0 ? (b.count / pctBase) * 100 : 0;
  const ropePos = 50 + (aRatio - 0.5) * 60;
  const others = sorted.slice(2);

  return (
    <div className="space-y-3">
      <div className="card p-5 space-y-4">
        <p className="text-center text-[10px] uppercase tracking-[0.3em] text-gray-500 font-bold">Tug of War</p>
        <div className="flex items-center justify-between mb-2">
          <div className="text-center flex-1">
            <p className="text-lg md:text-xl font-black" style={{ color: aColor }}>{a.optionText}</p>
            <p className="text-3xl md:text-4xl font-black" style={{ color: aColor }}>{a.count}</p>
            <p className="text-xs text-gray-500">{aPct.toFixed(0)}%</p>
          </div>
          <span className="text-2xl font-black text-gray-600 px-3">⚡</span>
          <div className="text-center flex-1">
            <p className="text-lg md:text-xl font-black" style={{ color: bColor }}>{b.optionText}</p>
            <p className="text-3xl md:text-4xl font-black" style={{ color: bColor }}>{b.count}</p>
            <p className="text-xs text-gray-500">{bPct.toFixed(0)}%</p>
          </div>
        </div>
        <div className="relative h-8 bg-gray-800 rounded-full overflow-hidden">
          <div className="absolute inset-0 flex">
            <div className="h-full transition-all duration-700" style={{ width: `${ropePos}%`, backgroundColor: `${aColor}44` }} />
            <div className="h-full transition-all duration-700" style={{ width: `${100 - ropePos}%`, backgroundColor: `${bColor}44` }} />
          </div>
          <div
            className="absolute top-0 bottom-0 w-3 rounded-full transition-all duration-700 z-10"
            style={{ left: `${ropePos}%`, transform: "translateX(-50%)", backgroundColor: "#fff", boxShadow: "0 0 10px rgba(255,255,255,0.5)" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-black text-white z-20">🪢</span>
          </div>
        </div>
        <div className="flex justify-between text-[10px] text-gray-600">
          <span>← {a.optionText}</span>
          <span>{b.optionText} →</span>
        </div>
      </div>
      {others.length > 0 && (
        <div className="card p-3 space-y-2">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">Other options</p>
          {others.map((v, i) => {
            const origIdx = votes.indexOf(v);
            const color = colors[origIdx % colors.length];
            const pct = pctBase > 0 ? (v.count / pctBase) * 100 : 0;
            return (
              <div key={v.optionId || i} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-xs text-gray-400 flex-1 truncate">{v.optionText}</span>
                <span className="text-xs font-bold" style={{ color }}>{v.count}</span>
                <span className="text-[9px] text-gray-500">({pct.toFixed(0)}%)</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TemplateCarRace({ votes, totalVotes, COLORS: colors, pctBase }) {
  if (votes.length === 0) return <div className="card p-8 text-center text-gray-600">No votes yet</div>;
  const max = Math.max(...votes.map((v) => v.count), 1);
  const sorted = [...votes].sort((a, b) => b.count - a.count);
  return (
    <div className="card p-0 overflow-hidden" style={{ background: "linear-gradient(180deg, #0a0a1a 0%, #1a1a2e 50%, #2d2d44 100%)" }}>
      <div className="text-center py-3 border-b border-gray-800/50" style={{ background: "linear-gradient(90deg, transparent, rgba(239,68,68,0.1), transparent)" }}>
        <p className="text-xs font-black tracking-[0.3em] text-red-400">🏎️ CAR RACE 🏎️</p>
      </div>
      <div className="p-4 space-y-4">
        {sorted.map((v, idx) => {
          const origIdx = votes.indexOf(v);
          const color = colors[origIdx % colors.length];
          const pct = pctBase > 0 ? (v.count / pctBase) * 100 : 0;
          const trackW = max > 0 ? (v.count / max) * 100 : 0;
          const isLeader = idx === 0 && v.count > 0;
          return (
            <div key={v.optionId || idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs px-1">
                <div className="flex items-center gap-2">
                  {isLeader && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-500 text-white">P1</span>}
                  <span className="font-bold" style={{ color }}>{v.optionText}</span>
                </div>
                <span className="font-black text-white">{v.count} <span className="text-gray-500 font-normal">({pct.toFixed(0)}%)</span></span>
              </div>
              <div className="w-full rounded-lg h-12 overflow-hidden relative" style={{ background: `linear-gradient(90deg, #1F293744, #1F2937)`, border: "1px solid #374151" }}>
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 9.8%, #ffffff20 10%, #ffffff20 10.2%)" }} />
                <div className="absolute top-0 bottom-0 w-px right-[2%] opacity-30" style={{ background: "repeating-linear-gradient(180deg, #fff 0px, #fff 4px, transparent 4px, transparent 8px)" }} />
                <div className="h-full transition-all duration-1000 ease-out flex items-center justify-end relative" style={{ width: `${Math.max(trackW, 8)}%` }}>
                  <svg viewBox="0 0 60 28" className="h-9 w-auto mr-1 relative z-10" style={{ filter: `drop-shadow(0 0 6px ${color}88)` }}>
                    <rect x="8" y="8" width="44" height="14" rx="4" fill={color} />
                    <rect x="4" y="12" width="52" height="8" rx="3" fill={color} opacity="0.8" />
                    <rect x="14" y="4" width="12" height="10" rx="2" fill={color} opacity="0.9" />
                    <rect x="28" y="5" width="16" height="9" rx="2" fill={color} opacity="0.7" />
                    <rect x="15" y="5" width="10" height="7" rx="1.5" fill="#88ccff" opacity="0.6" />
                    <rect x="30" y="6" width="12" height="6" rx="1.5" fill="#88ccff" opacity="0.5" />
                    <circle cx="16" cy="23" r="5" fill="#222" />
                    <circle cx="16" cy="23" r="3" fill="#555" />
                    <circle cx="44" cy="23" r="5" fill="#222" />
                    <circle cx="44" cy="23" r="3" fill="#555" />
                    <rect x="48" y="14" width="8" height="3" rx="1" fill="#ff4444" opacity="0.8" />
                  </svg>
                  {isLeader && v.count > 0 && (
                    <div className="absolute -top-1 right-0 text-[10px] animate-pulse">💨</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-gray-800/50 px-4 py-2 flex justify-between text-[10px] text-gray-600">
        <span>🏁 START</span>
        <span>{totalVotes} laps</span>
        <span>FINISH 🏁</span>
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
    case "treemap": return <TemplateTreemap {...props} />;
    case "donut": return <TemplateDonut {...props} />;
    case "hbars": return <TemplateHorizontalBars {...props} />;
    case "stacked": return <TemplateStacked {...props} />;
    case "wordcloud": return <TemplateWordCloud {...props} />;
    case "thermometer": return <TemplateThermometer {...props} />;
    case "rings": return <TemplateProgressRings {...props} />;
    case "heatmap": return <TemplateHeatmap {...props} />;
    case "scoreboard": return <TemplateScoreboard {...props} />;
    case "bracket": return <TemplateBracket {...props} />;
    case "countdown": return <TemplateCountdownBoard {...props} />;
    case "leaderboard": return <TemplateLeaderboard {...props} />;
    case "pulse": return <TemplatePulse {...props} />;
    case "slots": return <TemplateSlots {...props} />;
    case "particles": return <TemplateParticles {...props} />;
    case "bigscreen": return <TemplateBigScreen {...props} />;
    case "horserace": return <TemplateHorseRace {...props} />;
    case "balloon": return <TemplateBalloonRise {...props} />;
    case "tugofwar": return <TemplateTugOfWar {...props} />;
    case "carrace": return <TemplateCarRace {...props} />;
    default: return <TemplateClassic {...props} />;
  }
}

export default function Step4Dashboard({ socket, poll, group, onBack, isViewer, viewerTemplate, viewerEffect, viewerProfileImage, viewerDisplayName }) {
  const [votes, setVotes] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [uniqueVoters, setUniqueVoters] = useState(0);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [voteLog, setVoteLog] = useState([]);
  const [tab, setTab] = useState("results");
  const [isSharedToViewer, setIsSharedToViewer] = useState(false);
  const [voteSplashes, setVoteSplashes] = useState([]);
  const [profileImage, setProfileImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const profileInputRef = useRef(null);
  const [displayName, setDisplayName] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const nameInputRef = useRef(null);
  const [template, setTemplate] = useState(() => localStorage.getItem("pollTemplate") || "classic");
  const [effect, setEffect] = useState(() => localStorage.getItem("pollEffect") || "confetti");
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [diceRolling, setDiceRolling] = useState(false);
  const [diceWinner, setDiceWinner] = useState(null);
  const [diceCurrentOption, setDiceCurrentOption] = useState(null);
  const [diceCountdown, setDiceCountdown] = useState(null);
  const [diceFace, setDiceFace] = useState(0);
  const [showWinnerOverlay, setShowWinnerOverlay] = useState(false);
  const [isPollLocked, setIsPollLocked] = useState(poll?.isLocked || false);
  const [declaredWinner, setDeclaredWinner] = useState(poll?.winnerOption || null);
  const diceIntervalRef = useRef(null);
  const diceTimeoutRef = useRef(null);
  const diceCountdownRef = useRef(null);
  const diceFaceRef = useRef(null);
  const winnerOverlayTimerRef = useRef(null);
  const winnerFireworksRef = useRef(null);
  const prevTotalRef = useRef(0);
  const refreshTimerRef = useRef(null);
  const splashIdRef = useRef(0);
  const chartRef = useRef(null);
  const activeTemplate = isViewer ? (viewerTemplate || "classic") : template;
  const activeEffect = isViewer ? (viewerEffect || "confetti") : effect;
  const isMultiSelect = poll?.selectableCount !== 1;

  const showVoteToast = useCallback((voterName, voterPhone, selectedOption) => {
    if (!selectedOption) return;
    const id = ++splashIdRef.current;
    const shape = activeEffect === "random"
      ? SPLASH_SHAPES[Math.floor(Math.random() * SPLASH_SHAPES.length)]
      : "circle";
    const posX = 15 + Math.random() * 70;
    const posY = 15 + Math.random() * 55;
    const newSplash = { id, voterName, voterPhone, selectedOption, shape, posX, posY };
    setVoteSplashes((prev) => [...prev, newSplash]);
    fireEffect(activeEffect);
    setTimeout(() => {
      setVoteSplashes((prev) => prev.filter((s) => s.id !== id));
    }, 3500);
  }, [activeEffect]);

  const handleShareToViewer = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/viewer-poll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId: poll.id, template, effect }),
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

  const handleEffectChange = async (key) => {
    setEffect(key);
    localStorage.setItem("pollEffect", key);
    fireEffect(key);
    const id = ++splashIdRef.current;
    const shape = key === "random"
      ? SPLASH_SHAPES[Math.floor(Math.random() * SPLASH_SHAPES.length)]
      : "circle";
    const posX = 15 + Math.random() * 70;
    const posY = 15 + Math.random() * 55;
    setVoteSplashes((prev) => [...prev, { id, voterName: "Israel Cohen", voterPhone: "+972-00-0000000", selectedOption: votes[0]?.optionText || "Option", shape, posX, posY }]);
    setTimeout(() => setVoteSplashes((prev) => prev.filter((s) => s.id !== id)), 3500);
    try {
      await fetch(`${API_BASE}/api/viewer-effect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ effect: key }),
      });
    } catch (err) {
      console.error("Failed to sync effect:", err);
    }
  };

  const finalizeDeclareWinner = async (winnerName) => {
    setDiceRolling(false);
    setDiceCountdown(null);
    setDiceCurrentOption(null);
    setDiceWinner(winnerName);
    setDeclaredWinner(winnerName);
    setIsPollLocked(true);
    setShowWinnerOverlay(true);
    fireEffect("fireworks");
    setTimeout(() => fireEffect("confetti"), 600);
    if (winnerFireworksRef.current) clearInterval(winnerFireworksRef.current);
    winnerFireworksRef.current = setInterval(() => fireEffect("fireworks"), 3000);
    try {
      await fetch(`${API_BASE}/api/polls/${poll.id}/declare-winner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winner: winnerName }),
      });
    } catch (err) {
      console.error("Failed to declare winner:", err);
    }
  };

  const startDiceRoll = (tiedOptionTexts, prePickedWinner, viewerOnly) => {
    setDiceRolling(true);
    setDiceWinner(null);
    setDiceCountdown(10);

    let optIdx = 0;
    diceIntervalRef.current = setInterval(() => {
      optIdx = (optIdx + 1) % tiedOptionTexts.length;
      setDiceCurrentOption(tiedOptionTexts[optIdx]);
    }, 120);

    let faceIdx = 0;
    diceFaceRef.current = setInterval(() => {
      faceIdx = (faceIdx + 1) % DICE_FACES.length;
      setDiceFace(faceIdx);
    }, 200);

    let remaining = 10;
    diceCountdownRef.current = setInterval(() => {
      remaining--;
      setDiceCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(diceCountdownRef.current);
        clearInterval(diceIntervalRef.current);
        clearInterval(diceFaceRef.current);
        setDiceCurrentOption(prePickedWinner);
        if (viewerOnly) {
          setTimeout(() => {
            setDiceRolling(false);
            setDiceCountdown(null);
            setDiceCurrentOption(null);
            setDiceWinner(prePickedWinner);
            setDeclaredWinner(prePickedWinner);
            setIsPollLocked(true);
            setShowWinnerOverlay(true);
            fireEffect("fireworks");
            setTimeout(() => fireEffect("confetti"), 600);
            if (winnerFireworksRef.current) clearInterval(winnerFireworksRef.current);
            winnerFireworksRef.current = setInterval(() => fireEffect("fireworks"), 3000);
          }, 800);
        } else {
          setTimeout(() => finalizeDeclareWinner(prePickedWinner), 800);
        }
      }
    }, 1000);
  };

  const handleDeclareWinner = async () => {
    if (diceRolling) return;
    const best = votes.reduce((b, v) => (v.count > b.count ? v : b), { count: 0, optionText: "-" });
    if (best.count === 0) return;

    const maxCount = best.count;
    const tied = votes.filter((v) => v.count === maxCount);

    if (tied.length <= 1) {
      finalizeDeclareWinner(best.optionText);
      return;
    }

    const winner = tied[Math.floor(Math.random() * tied.length)];
    const tiedTexts = tied.map((t) => t.optionText);

    try {
      await fetch(`${API_BASE}/api/viewer-dice-roll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ options: tiedTexts, winner: winner.optionText, pollId: poll.id }),
      });
    } catch (err) {
      console.error("Failed to broadcast dice roll:", err);
    }

    startDiceRoll(tiedTexts, winner.optionText, false);
  };

  const handleReopenPoll = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/polls/${poll.id}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        setIsPollLocked(false);
        setDeclaredWinner(null);
        setDiceWinner(null);
        setShowWinnerOverlay(false);
        if (winnerFireworksRef.current) clearInterval(winnerFireworksRef.current);
      }
    } catch (err) {
      console.error("Failed to reopen poll:", err);
    }
  };

  const handleExportPDF = async (mode) => {
    setShowPdfModal(false);
    const leading = votes.reduce((best, v) => (v.count > best.count ? v : best), { count: 0, optionText: "-" });
    const sortedVoters = [...allVoters].sort((a, b) => (a.name || a.phone || "").localeCompare(b.name || b.phone || ""));

    const includeChart = mode === "full" || mode === "results";
    const includeVoters = mode === "full" || mode === "table";
    const includeActivity = mode === "full";

    const headerHtml = `
      <div style="border-bottom:3px solid #25D366;padding-bottom:16px;margin-bottom:20px;">
        <h1 style="font-size:28px;color:#25D366;margin:0 0 6px 0;">${poll?.title || "Poll Report"}</h1>
        <p style="font-size:14px;color:#999;margin:0 0 4px 0;">${group?.name || ""}</p>
        <p style="font-size:11px;color:#666;margin:0;">
          ${new Date().toLocaleString("he-IL")}
          ${isMultiSelect ? `&nbsp;&nbsp;|&nbsp;&nbsp;בחירה מרובה (עד ${poll?.selectableCount === 0 ? "ללא הגבלה" : poll?.selectableCount})` : ""}
        </p>
      </div>
    `;

    const statsHtml = includeChart ? `
      <div style="display:flex;gap:12px;margin-bottom:24px;">
        <div style="flex:1;background:#1a1a1a;border-radius:10px;padding:14px;text-align:center;border:1px solid #333;">
          <div style="font-size:28px;font-weight:bold;color:#25D366;">${uniqueVoters}</div>
          <div style="font-size:11px;color:#888;">מצביעים</div>
        </div>
        ${isMultiSelect ? `<div style="flex:1;background:#1a1a1a;border-radius:10px;padding:14px;text-align:center;border:1px solid #333;">
          <div style="font-size:28px;font-weight:bold;color:#a855f7;">${totalVotes}</div>
          <div style="font-size:11px;color:#888;">בחירות</div>
        </div>` : ""}
        <div style="flex:1;background:#1a1a1a;border-radius:10px;padding:14px;text-align:center;border:1px solid #333;">
          <div style="font-size:28px;font-weight:bold;color:#3b82f6;">${votes.length}</div>
          <div style="font-size:11px;color:#888;">אפשרויות</div>
        </div>
        <div style="flex:1;background:#1a1a1a;border-radius:10px;padding:14px;text-align:center;border:1px solid #333;">
          <div style="font-size:18px;font-weight:bold;color:#f59e0b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${leading.optionText}</div>
          <div style="font-size:11px;color:#888;">מוביל (${leading.count})</div>
        </div>
      </div>
      <div id="pdf-chart-slot" style="margin-bottom:24px;"></div>
    ` : "";

    const votersHtml = includeVoters ? `
      <div style="margin-top:12px;margin-bottom:8px;">
        <h2 style="font-size:16px;color:#25D366;margin:0 0 4px 0;border-bottom:1px solid #333;padding-bottom:6px;">רשימת מצביעים</h2>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:#1a1a1a;">
            <th style="padding:8px 10px;text-align:right;color:#888;border-bottom:1px solid #333;">#</th>
            <th style="padding:8px 10px;text-align:right;color:#888;border-bottom:1px solid #333;">שם</th>
            <th style="padding:8px 10px;text-align:right;color:#888;border-bottom:1px solid #333;">טלפון</th>
            <th style="padding:8px 10px;text-align:right;color:#888;border-bottom:1px solid #333;">בחירה</th>
          </tr>
        </thead>
        <tbody>
          ${sortedVoters.length > 0 ? sortedVoters.map((v, i) => `
            <tr style="background:${i % 2 === 0 ? "#151515" : "#1a1a1a"};">
              <td style="padding:6px 10px;border-bottom:1px solid #222;color:#666;">${i + 1}</td>
              <td style="padding:6px 10px;border-bottom:1px solid #222;color:#eee;font-weight:500;">${v.name || "-"}</td>
              <td style="padding:6px 10px;border-bottom:1px solid #222;color:#aaa;direction:ltr;text-align:right;">${v.phone || "-"}</td>
              <td style="padding:6px 10px;border-bottom:1px solid #222;color:#25D366;font-weight:500;">${v.options ? v.options.map(o => o.text).join(", ") : v.option || "-"}</td>
            </tr>
          `).join("") : `<tr><td colspan="4" style="padding:12px;text-align:center;color:#666;">אין מצביעים עדיין</td></tr>`}
        </tbody>
      </table>
    ` : "";

    const activityHtml = includeActivity ? `
      <div style="margin-top:28px;margin-bottom:8px;">
        <h2 style="font-size:16px;color:#999;margin:0 0 4px 0;border-bottom:1px solid #333;padding-bottom:6px;">לוג פעילות (שינויי הצבעה)</h2>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:11px;">
        <thead>
          <tr style="background:#1a1a1a;">
            <th style="padding:6px 8px;text-align:right;color:#888;border-bottom:1px solid #333;">#</th>
            <th style="padding:6px 8px;text-align:right;color:#888;border-bottom:1px solid #333;">מצביע</th>
            <th style="padding:6px 8px;text-align:right;color:#888;border-bottom:1px solid #333;">פעולה</th>
            <th style="padding:6px 8px;text-align:right;color:#888;border-bottom:1px solid #333;">תאריך</th>
          </tr>
        </thead>
        <tbody>
          ${voteLog.length > 0 ? voteLog.map((log, i) => `
            <tr style="background:${i % 2 === 0 ? "#151515" : "#1a1a1a"};">
              <td style="padding:5px 8px;border-bottom:1px solid #222;color:#666;">${i + 1}</td>
              <td style="padding:5px 8px;border-bottom:1px solid #222;color:#eee;">${log.voterName || formatPhone(log.voterJid)}</td>
              <td style="padding:5px 8px;border-bottom:1px solid #222;color:${log.selectedOptionText ? "#25D366" : "#ef4444"};">${log.selectedOptionText ? log.selectedOptionText.split("|").join(", ") : "ביטול הצבעה"}</td>
              <td style="padding:5px 8px;border-bottom:1px solid #222;color:#888;direction:ltr;text-align:right;">${new Date(log.timestamp).toLocaleString("he-IL")}</td>
            </tr>
          `).join("") : `<tr><td colspan="4" style="padding:12px;text-align:center;color:#666;">אין פעילות עדיין</td></tr>`}
        </tbody>
      </table>
    ` : "";

    const container = document.createElement("div");
    container.style.cssText = "position:fixed;left:-9999px;top:0;width:800px;background:#111;color:#eee;font-family:system-ui,-apple-system,sans-serif;padding:40px;direction:rtl;";
    container.innerHTML = `
      ${headerHtml}
      ${statsHtml}
      ${votersHtml}
      ${activityHtml}
      <div style="margin-top:24px;text-align:center;color:#555;font-size:10px;border-top:1px solid #333;padding-top:10px;">
        Generated by WAPollView &bull; ${new Date().toLocaleString("he-IL")}
      </div>
    `;

    document.body.appendChild(container);

    if (includeChart && chartRef.current) {
      try {
        const chartCanvas = await html2canvas(chartRef.current, { backgroundColor: "#111", scale: 2, useCORS: true, logging: false });
        const chartImg = document.createElement("img");
        chartImg.src = chartCanvas.toDataURL("image/png");
        chartImg.style.cssText = "width:100%;border-radius:8px;";
        const slot = container.querySelector("#pdf-chart-slot");
        if (slot) slot.appendChild(chartImg);
      } catch (e) {
        console.error("Chart capture failed:", e);
      }
    }

    await new Promise((r) => setTimeout(r, 300));

    try {
      const canvas = await html2canvas(container, { backgroundColor: "#111", scale: 2, useCORS: true, logging: false });

      const doc = new jsPDF("p", "mm", "a4");
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 8;
      const contentW = pageW - margin * 2;

      const imgRatio = canvas.width / canvas.height;
      const fullImgH = contentW / imgRatio;
      const usableH = pageH - margin * 2;

      let srcY = 0;
      const totalSrcH = canvas.height;
      const srcPageH = (usableH / fullImgH) * totalSrcH;
      let pageNum = 0;

      while (srcY < totalSrcH) {
        if (pageNum > 0) doc.addPage();
        const sliceH = Math.min(srcPageH, totalSrcH - srcY);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceH;
        const ctx = sliceCanvas.getContext("2d");
        ctx.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
        const sliceData = sliceCanvas.toDataURL("image/png");
        const sliceImgH = (sliceH / totalSrcH) * fullImgH;
        doc.addImage(sliceData, "PNG", margin, margin, contentW, sliceImgH);
        srcY += sliceH;
        pageNum++;
      }

      const modeLabel = mode === "full" ? "full" : mode === "results" ? "results" : "voters";
      const safeName = (poll?.title || "poll").replace(/[^a-zA-Z0-9\u0590-\u05FF ]/g, "").trim().replace(/\s+/g, "_");
      const dateStr = new Date().toISOString().slice(0, 10);
      doc.save(`${safeName}_${modeLabel}_${dateStr}.pdf`);
    } catch (e) {
      console.error("PDF generation failed:", e);
    } finally {
      document.body.removeChild(container);
    }
  };

  useEffect(() => {
    if (isViewer) {
      setProfileImage(viewerProfileImage || null);
      setDisplayName(viewerDisplayName ?? null);
      return;
    }
    fetch(`${API_BASE}/api/viewer-poll`)
      .then((r) => r.json())
      .then((data) => {
        if (data.profileImage) setProfileImage(data.profileImage);
        if (data.displayName !== undefined) setDisplayName(data.displayName);
      })
      .catch(() => {});
  }, [isViewer, viewerProfileImage, viewerDisplayName]);

  const handleProfileImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target.result;
        const res = await fetch(`${API_BASE}/api/viewer-profile-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 }),
        });
        const data = await res.json();
        if (data.success) setProfileImage(base64);
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadingImage(false);
    }
    if (profileInputRef.current) profileInputRef.current.value = "";
  };

  const handleRemoveProfileImage = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/viewer-profile-image`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) setProfileImage(null);
    } catch {}
  };

  const handleStartEditName = () => {
    setEditNameValue(displayName || group?.name || "");
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 50);
  };

  const handleSaveName = async () => {
    const newName = editNameValue.trim();
    try {
      const res = await fetch(`${API_BASE}/api/viewer-display-name`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      const data = await res.json();
      if (data.success) setDisplayName(newName);
    } catch {}
    setEditingName(false);
  };

  useEffect(() => {
    if (isViewer) return;
    fetch(`${API_BASE}/api/viewer-poll`)
      .then((r) => r.json())
      .then((data) => { if (data.poll?.id === poll?.id) setIsSharedToViewer(true); })
      .catch(() => {});
  }, [poll?.id, isViewer]);

  useEffect(() => {
    if (!poll?.id) return;
    fetch(`${API_BASE}/api/polls/${poll.id}`)
      .then((r) => r.json())
      .then((data) => {
        setIsPollLocked(data.isLocked || false);
        setDeclaredWinner(data.winnerOption || null);
        if (data.isLocked && data.winnerOption) {
          setDiceWinner(data.winnerOption);
          setShowWinnerOverlay(true);
          fireEffect("fireworks");
          setTimeout(() => fireEffect("confetti"), 600);
          if (winnerFireworksRef.current) clearInterval(winnerFireworksRef.current);
          winnerFireworksRef.current = setInterval(() => fireEffect("fireworks"), 3000);
        }
      })
      .catch(() => {});
  }, [poll?.id]);

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
    const handlePollLocked = (data) => {
      if (data.pollId === poll.id) {
        setIsPollLocked(true);
        setDeclaredWinner(data.winner);
        setDiceWinner(data.winner);
        setShowWinnerOverlay(true);
        fireEffect("fireworks");
        setTimeout(() => fireEffect("confetti"), 600);
        if (winnerFireworksRef.current) clearInterval(winnerFireworksRef.current);
        winnerFireworksRef.current = setInterval(() => fireEffect("fireworks"), 3000);
      }
    };
    const handlePollReopened = (data) => {
      if (data.pollId === poll.id) {
        setIsPollLocked(false);
        setDeclaredWinner(null);
        setDiceWinner(null);
        setShowWinnerOverlay(false);
        if (winnerFireworksRef.current) clearInterval(winnerFireworksRef.current);
      }
    };
    socket.on("connect", handleReconnect);
    socket.on("poll_vote_received", handleVote);
    socket.on("poll_data_changed", handleChanged);
    socket.on("history_sync_complete", handleHistorySync);
    socket.on("poll_locked", handlePollLocked);
    socket.on("poll_reopened", handlePollReopened);

    return () => {
      socket.off("connect", handleReconnect);
      socket.off("poll_vote_received", handleVote);
      socket.off("poll_data_changed", handleChanged);
      socket.off("history_sync_complete", handleHistorySync);
      socket.off("poll_locked", handlePollLocked);
      socket.off("poll_reopened", handlePollReopened);
      socket.emit("unsubscribe_from_poll", { pollId: poll.id });
    };
  }, [socket, poll?.id, fetchData, showVoteToast]);

  useEffect(() => {
    if (!socket) return;
    const handleAnnounce = (data) => {
      if (!data?.winner) return;
      if (diceRolling) return;
      setDiceWinner(data.winner);
      setDeclaredWinner(data.winner);
      setIsPollLocked(true);
      setShowWinnerOverlay(true);
      fireEffect("fireworks");
      setTimeout(() => fireEffect("confetti"), 600);
      if (winnerFireworksRef.current) clearInterval(winnerFireworksRef.current);
      winnerFireworksRef.current = setInterval(() => fireEffect("fireworks"), 3000);
    };
    const handleDiceRoll = (data) => {
      if (!data?.options || !data?.winner) return;
      if (diceRolling) return;
      if (!isViewer) return;
      startDiceRoll(data.options, data.winner, true);
    };
    socket.on("viewer_announce_winner", handleAnnounce);
    socket.on("viewer_dice_roll", handleDiceRoll);
    return () => {
      socket.off("viewer_announce_winner", handleAnnounce);
      socket.off("viewer_dice_roll", handleDiceRoll);
    };
  }, [socket, diceRolling]);

  const chartData = votes.map((v) => ({
    name: v.optionText.length > 12 ? v.optionText.substring(0, 12) + "..." : v.optionText,
    fullName: v.optionText,
    votes: v.count,
  }));

  const leading = votes.reduce((best, v) => (v.count > best.count ? v : best), { count: 0, optionText: "-" });

  const maxCount = leading.count;
  const tiedOptions = maxCount > 0 ? votes.filter((v) => v.count === maxCount) : [];
  const isTie = tiedOptions.length > 1;


  useEffect(() => {
    if (!isTie && !isPollLocked) {
      setDiceWinner(null);
      setDiceCurrentOption(null);
      setDiceCountdown(null);
      setDiceRolling(false);
      setShowWinnerOverlay(false);
      if (diceIntervalRef.current) clearInterval(diceIntervalRef.current);
      if (diceTimeoutRef.current) clearTimeout(diceTimeoutRef.current);
      if (diceCountdownRef.current) clearInterval(diceCountdownRef.current);
      if (diceFaceRef.current) clearInterval(diceFaceRef.current);
      if (winnerOverlayTimerRef.current) clearTimeout(winnerOverlayTimerRef.current);
      if (winnerFireworksRef.current) clearInterval(winnerFireworksRef.current);
    }
  }, [isTie, votes, isPollLocked]);

  useEffect(() => {
    if (isViewer && isPollLocked && declaredWinner) {
      if (winnerFireworksRef.current) clearInterval(winnerFireworksRef.current);
      fireEffect("fireworks");
      winnerFireworksRef.current = setInterval(() => fireEffect("fireworks"), 3000);
    }
    if (!isPollLocked) {
      if (winnerFireworksRef.current) clearInterval(winnerFireworksRef.current);
    }
  }, [isViewer, isPollLocked, declaredWinner]);

  useEffect(() => {
    return () => {
      if (diceIntervalRef.current) clearInterval(diceIntervalRef.current);
      if (diceTimeoutRef.current) clearTimeout(diceTimeoutRef.current);
      if (diceCountdownRef.current) clearInterval(diceCountdownRef.current);
      if (diceFaceRef.current) clearInterval(diceFaceRef.current);
      if (winnerOverlayTimerRef.current) clearTimeout(winnerOverlayTimerRef.current);
      if (winnerFireworksRef.current) clearInterval(winnerFireworksRef.current);
    };
  }, []);

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
      <VoteSplash splashes={voteSplashes} />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {!isViewer && (
            <button onClick={onBack} className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          {(profileImage || !isViewer) && (
            <div className="relative shrink-0 group/pic">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={group?.name || "Group"}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-700"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-wa-green/30 to-blue-500/30 flex items-center justify-center ring-2 ring-gray-700">
                  <span className="text-sm font-bold text-gray-300">
                    {(group?.name || "?").charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              {!isViewer && (
                <>
                  <input ref={profileInputRef} type="file" accept="image/*" className="hidden" onChange={handleProfileImageUpload} />
                  <button
                    onClick={() => profileInputRef.current?.click()}
                    className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover/pic:opacity-100 transition-opacity flex items-center justify-center"
                    title={profileImage ? "Change image" : "Upload image"}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? (
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                  {profileImage && (
                    <button
                      onClick={handleRemoveProfileImage}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/pic:opacity-100 transition-opacity text-[10px] font-bold hover:bg-red-400"
                      title="Remove image"
                    >
                      ×
                    </button>
                  )}
                </>
              )}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-lg font-bold truncate">{poll?.title}</h2>
            {!isViewer && editingName ? (
              <input
                ref={nameInputRef}
                value={editNameValue}
                onChange={(e) => setEditNameValue(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditingName(false); }}
                className="bg-gray-800 border border-gray-600 rounded px-1.5 py-0.5 text-xs text-gray-300 w-full max-w-[200px] outline-none focus:border-wa-green"
                autoFocus
              />
            ) : (
              <p
                className={`text-gray-400 text-xs truncate ${!isViewer ? "cursor-pointer hover:text-gray-200 transition-colors" : ""}`}
                onClick={!isViewer ? handleStartEditName : undefined}
                title={!isViewer ? "Click to edit display name" : undefined}
              >
                {displayName !== "" ? (displayName || group?.name) : null}
                {!isViewer && (
                  <svg className="w-2.5 h-2.5 inline-block ml-1 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                )}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button onClick={fetchData} className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors" title="Refresh">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          {!isViewer && (
            <button
              onClick={() => setShowPdfModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-500 transition-all shadow-sm"
              title="Export poll report as PDF"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a2 2 0 002 2h14a2 2 0 002-2v-3" />
              </svg>
              PDF
            </button>
          )}
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
          {!isViewer && !isPollLocked && (
            <button
              onClick={handleDeclareWinner}
              disabled={leading.count === 0 || diceRolling}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-amber-500 text-white shadow-lg shadow-amber-500/30 hover:bg-amber-400 hover:shadow-amber-400/50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-amber-500"
              title={isTie ? "Roll dice to pick a winner" : "Declare winner and lock the poll"}
            >
              <span className="text-sm">{isTie ? "🎲" : "🏆"}</span>
              Declare Winner
            </button>
          )}
          {!isViewer && isPollLocked && (
            <button
              onClick={handleReopenPoll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 hover:shadow-emerald-500/50"
              title="Reopen poll to accept new votes"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
              Reopen Poll
            </button>
          )}
        </div>
      </div>

      {/* Lock status banner */}
      {isPollLocked && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-amber-400">Poll Locked — Final Results</p>
            <p className="text-xs text-gray-400 truncate">
              Winner: <span className="text-white font-semibold">{declaredWinner}</span>
              {!isViewer && <span className="ml-2 text-gray-500">• New votes are blocked</span>}
            </p>
          </div>
          <span className="text-2xl">🏆</span>
        </div>
      )}

      {/* Stats */}
      <div className={`grid gap-2 ${isMultiSelect ? "grid-cols-2" : "grid-cols-1"}`}>
        {isMultiSelect && (
          <div className="card p-3 text-center">
            <p className="text-2xl font-bold text-purple-400">{totalVotes}</p>
            <p className="text-[10px] text-gray-500">Selections</p>
          </div>
        )}
        <div className="card p-3 text-center">
          {diceWinner && !diceRolling ? (
            <div className="animate-bounce-in">
              <p className="text-sm font-bold text-wa-green truncate">🏆 {diceWinner}</p>
              <p className="text-[10px] text-gray-500">Winner!</p>
            </div>
          ) : (
            <>
              <p className="text-sm font-bold text-amber-400 truncate">
                {isTie ? tiedOptions.map((o) => o.optionText).join(" / ") : leading.optionText}
              </p>
              <p className="text-[10px] text-gray-500">
                {isTie ? `Tie! (${tiedOptions.length})` : `Leading (${leading.count})`}
              </p>
            </>
          )}
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
          { key: "voters", label: `Voters`, icon: "👥", badge: allVoters.length },
          { key: "activity", label: "Activity", icon: "⚡", badge: voteLog.length },
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
            {t.badge != null && (
              <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold inline-flex items-center justify-center ${
                tab === t.key ? "bg-wa-green/30 text-wa-green" : "bg-gray-700 text-gray-300"
              }`}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Template picker (Admin only) */}
      {tab === "results" && !isViewer && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
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
          <div className="flex items-center gap-2 flex-wrap">
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

      {/* Effect picker (Admin only) */}
      {tab === "results" && !isViewer && (
        <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-gray-800">
          <span className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold mr-1">Effects</span>
          {VOTE_EFFECTS.map((e) => (
            <button
              key={e.key}
              onClick={() => handleEffectChange(e.key)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 border ${
                activeEffect === e.key
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-500/10"
                  : "bg-gray-800/50 text-gray-400 border-gray-700 hover:text-cyan-300 hover:border-cyan-500/40"
              }`}
            >
              <span>{e.icon}</span>
              <span>{e.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Results tab */}
      {tab === "results" && (
        <div ref={chartRef}>
          {renderTemplate(activeTemplate, { votes, chartData, totalVotes, COLORS, allVoters, uniqueVoters, isMultiSelect, pctBase: isMultiSelect ? (uniqueVoters || 1) : (totalVotes || 1) })}
        </div>
      )}

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

      {showPdfModal && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowPdfModal(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">ייצוא PDF</h3>
              <button onClick={() => setShowPdfModal(false)} className="text-gray-400 hover:text-white transition-colors text-xl leading-none">&times;</button>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => handleExportPDF("full")}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-wa-green/50 transition-all group text-right"
              >
                <div className="w-11 h-11 rounded-lg bg-wa-green/15 flex items-center justify-center text-xl shrink-0 group-hover:bg-wa-green/25 transition-colors">
                  📋
                </div>
                <div>
                  <p className="text-sm font-bold text-white group-hover:text-wa-green transition-colors">דוח מלא</p>
                  <p className="text-xs text-gray-400 mt-0.5">גרף, טבלת מצביעים ולוג פעילות</p>
                </div>
              </button>
              <button
                onClick={() => handleExportPDF("results")}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-blue-500/50 transition-all group text-right"
              >
                <div className="w-11 h-11 rounded-lg bg-blue-500/15 flex items-center justify-center text-xl shrink-0 group-hover:bg-blue-500/25 transition-colors">
                  📊
                </div>
                <div>
                  <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">תוצאות הסקר</p>
                  <p className="text-xs text-gray-400 mt-0.5">סיכום וגרף בלבד</p>
                </div>
              </button>
              <button
                onClick={() => handleExportPDF("table")}
                className="w-full flex items-center gap-4 p-4 rounded-xl bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-amber-500/50 transition-all group text-right"
              >
                <div className="w-11 h-11 rounded-lg bg-amber-500/15 flex items-center justify-center text-xl shrink-0 group-hover:bg-amber-500/25 transition-colors">
                  👥
                </div>
                <div>
                  <p className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">טבלת מצביעים</p>
                  <p className="text-xs text-gray-400 mt-0.5">רשימת שמות, טלפונים ובחירות</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dice countdown overlay */}
      {diceRolling && diceCountdown !== null && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md"
          style={{ animation: "winnerFadeIn 0.3s ease-out" }}
        >
          <div className="flex flex-col items-center gap-6 px-6">
            {/* 3D Dice */}
            <div className="dice-scene">
              <div className="dice-cube">
                <div className="dice-face face-front" />
                <div className="dice-face face-back" />
                <div className="dice-face face-right" />
                <div className="dice-face face-left" />
                <div className="dice-face face-top" />
                <div className="dice-face face-bottom" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-6xl sm:text-8xl font-black text-white tabular-nums" style={{ animation: "dicePulse 1s ease-in-out infinite" }}>
                {diceCountdown}
              </p>
            </div>
            <div className="h-12 flex items-center">
              <p className="text-2xl sm:text-3xl font-bold text-cyan-400 truncate animate-pulse max-w-[80vw]">
                {diceCurrentOption || "..."}
              </p>
            </div>
            <p className="text-sm text-gray-500 tracking-wider uppercase">Picking a winner...</p>
          </div>
          <style>{`
            .dice-scene {
              width: 90px;
              height: 90px;
              perspective: 400px;
              animation: diceBounce 1.2s ease-in-out infinite;
            }
            .dice-cube {
              width: 100%;
              height: 100%;
              position: relative;
              transform-style: preserve-3d;
              animation: diceRoll 3s ease-in-out infinite;
            }
            .dice-face {
              position: absolute;
              width: 90px;
              height: 90px;
              background: #fff;
              border: 2px solid #ccc;
              border-radius: 12px;
              box-shadow: inset 0 0 12px rgba(0,0,0,0.08);
            }
            .dice-face::before {
              content: '';
              position: absolute;
              width: 16px;
              height: 16px;
              background: #222;
              border-radius: 50%;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
            }

            /* Face 1 - front (single center dot) */
            .face-front {
              transform: translateZ(45px);
            }

            /* Face 6 - back */
            .face-back {
              transform: rotateY(180deg) translateZ(45px);
            }
            .face-back::before {
              background: transparent;
              box-shadow:
                -22px -24px 0 0 #222,
                -22px  0px 0 0 #222,
                -22px  24px 0 0 #222,
                 22px -24px 0 0 #222,
                 22px  0px 0 0 #222,
                 22px  24px 0 0 #222;
            }

            /* Face 2 - right */
            .face-right {
              transform: rotateY(90deg) translateZ(45px);
            }
            .face-right::before {
              background: transparent;
              box-shadow:
                -22px -24px 0 0 #222,
                 22px  24px 0 0 #222;
            }

            /* Face 5 - left */
            .face-left {
              transform: rotateY(-90deg) translateZ(45px);
            }
            .face-left::before {
              box-shadow:
                -22px -24px 0 0 #222,
                -22px  24px 0 0 #222,
                 22px -24px 0 0 #222,
                 22px  24px 0 0 #222;
            }

            /* Face 3 - top */
            .face-top {
              transform: rotateX(90deg) translateZ(45px);
            }
            .face-top::before {
              box-shadow:
                -22px  24px 0 0 #222,
                 22px -24px 0 0 #222;
            }

            /* Face 4 - bottom */
            .face-bottom {
              transform: rotateX(-90deg) translateZ(45px);
            }
            .face-bottom::before {
              background: transparent;
              box-shadow:
                -22px -24px 0 0 #222,
                -22px  24px 0 0 #222,
                 22px -24px 0 0 #222,
                 22px  24px 0 0 #222;
            }

            @keyframes diceRoll {
              0%   { transform: rotateX(0deg)   rotateY(0deg)   rotateZ(0deg); }
              25%  { transform: rotateX(90deg)  rotateY(180deg) rotateZ(45deg); }
              50%  { transform: rotateX(180deg) rotateY(360deg) rotateZ(90deg); }
              75%  { transform: rotateX(270deg) rotateY(540deg) rotateZ(135deg); }
              100% { transform: rotateX(360deg) rotateY(720deg) rotateZ(180deg); }
            }
            @keyframes diceBounce {
              0%, 100% { transform: translateY(0); }
              50%      { transform: translateY(-30px); }
            }
            @keyframes dicePulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.7; transform: scale(0.95); }
            }
          `}</style>
        </div>
      )}

      {/* Winner celebration overlay */}
      {((isViewer && isPollLocked && declaredWinner) || (showWinnerOverlay && (diceWinner || declaredWinner))) && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/90 backdrop-blur-md"
          onClick={isPollLocked ? undefined : () => {
            setShowWinnerOverlay(false);
            if (winnerFireworksRef.current) clearInterval(winnerFireworksRef.current);
          }}
          style={{ animation: "winnerFadeIn 0.5s ease-out" }}
        >
          <div className="flex flex-col items-center gap-6 px-6" style={{ animation: "winnerScaleIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
            <div className="text-8xl sm:text-9xl" style={{ animation: "winnerTrophyBounce 1s ease-in-out infinite" }}>🏆</div>
            <div className="text-center">
              <p className="text-xl sm:text-2xl text-amber-400 font-bold tracking-widest uppercase mb-3" style={{ animation: "winnerFadeIn 0.8s ease-out 0.3s both" }}>Winner</p>
              <p className="text-4xl sm:text-6xl font-black text-white drop-shadow-[0_0_40px_rgba(37,211,102,0.6)]" style={{ animation: "winnerFadeIn 0.8s ease-out 0.5s both" }}>{diceWinner || declaredWinner}</p>
              {isPollLocked && (
                <p className="text-sm text-gray-400 mt-4 tracking-wide" style={{ animation: "winnerFadeIn 0.8s ease-out 0.9s both" }}>
                  {poll?.title}
                </p>
              )}
            </div>
            <div className="flex gap-3 mt-2" style={{ animation: "winnerFadeIn 0.8s ease-out 0.7s both" }}>
              {["🎉", "⭐", "🎊", "✨", "🎆"].map((e, i) => (
                <span key={i} className="text-3xl sm:text-4xl" style={{ animation: `winnerStarFloat 1.5s ease-in-out ${i * 0.2}s infinite alternate` }}>{e}</span>
              ))}
            </div>
            {!isViewer && isPollLocked && (
              <div className="flex items-center gap-3 mt-6" style={{ animation: "winnerFadeIn 0.8s ease-out 1.1s both" }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowWinnerOverlay(false);
                    if (winnerFireworksRef.current) clearInterval(winnerFireworksRef.current);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all bg-white/10 text-white/80 border border-white/20 hover:bg-white/20 hover:text-white backdrop-blur-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                  Hide
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReopenPoll();
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 hover:text-emerald-200 backdrop-blur-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  Reopen Poll
                </button>
              </div>
            )}
          </div>
          <style>{`
            @keyframes winnerFadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes winnerScaleIn {
              from { opacity: 0; transform: scale(0.3) rotate(-10deg); }
              to { opacity: 1; transform: scale(1) rotate(0deg); }
            }
            @keyframes winnerTrophyBounce {
              0%, 100% { transform: translateY(0) scale(1); }
              50% { transform: translateY(-16px) scale(1.1); }
            }
            @keyframes winnerStarFloat {
              from { transform: translateY(0) scale(1); }
              to { transform: translateY(-10px) scale(1.2); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
