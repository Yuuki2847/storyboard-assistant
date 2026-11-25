"use strict";

function planStoryboard(script) {
  const shots = [];
  let scene = "";
  let pending = null;
  function add(text) {
    const source = text.trim();
    if (!source) return;
    const explicit = source.match(/大特写|特写|近景|中景|全景|远景/);
    const detail = /看向|注视|手指|眼睛|屏幕|手机|钥匙/.test(source);
    const moving = /奔跑|跑向|冲向|奔向|追赶/.test(source);
    const establishing = /空镜|登场|走进|走出|进入|离开/.test(source) ||
      Boolean(scene && shots.at(-1)?.scene !== scene);
    const dialogue = /^[^：:\n]{1,12}[：:]/.test(source);
    const scale = explicit?.[0] ?? (detail ? "特写" : establishing || moving ? "全景" : dialogue ? "近景" : "中景");
    shots.push({ scene, text: source, scale, moving, dialogue,
      empty: /空镜/.test(source),
      dark: /夜|月光/.test(scene + source),
      outdoor: /外景|室外|街道|公园|海边|山坡/.test(scene + source) });
  }
  function flush() {
    if (pending) add(pending.lines.join("\n") || pending.description);
    pending = null;
  }
  for (const raw of script.split(/\r?\n/)) {
    const line = raw.trim().replace(/^#{1,6}\s+/, "");
    if (!line) continue;
    if (/^(?:第\s*[\d一二三四五六七八九十百]+\s*场|(?:内景|外景|INT\.|EXT\.)|\[[^\]]+\]$)/i.test(line)) {
      flush();
      scene = line;
      continue;
    }
    const cue = line.match(/^(?:镜头\s*\d+|第\s*\d+\s*镜(?:头)?)\s*[：:、.\-]?\s*(.*)$/);
    if (cue) {
      flush();
      pending = { description: cue[1], lines: cue[1] ? [cue[1]] : [] };
    } else if (pending) {
      pending.lines.push(line);
    } else {
      for (const part of line.match(/[^。！？]+[。！？]*/g) ?? []) add(part);
    }
  }
  flush();
  return shots;
}

function drawStoryboardFrame(shot) {
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 540;
  const ctx = canvas.getContext("2d");

  function shape(color, points) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (const [x, y] of points) ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fill();
  }
  function line(color, width, points) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    for (const [x, y] of points) ctx.lineTo(x, y);
    ctx.stroke();
  }

  ctx.fillStyle = shot.dark ? "#2b3a50" : "#c8d7df";
  ctx.fillRect(0, 0, 960, 540);
  if (shot.outdoor) {
    shape(shot.dark ? "#405365" : "#a0b4bf", [[0, 340], [170, 190], [340, 331], [570, 220], [960, 356], [960, 540], [0, 540]]);
    shape("#718593", [[0, 390], [960, 348], [960, 540], [0, 540]]);
  } else {
    shape(shot.dark ? "#536477" : "#a6b8c3", [[0, 335], [320, 300], [670, 300], [960, 365], [960, 540], [0, 540]]);
    line("#8497a5", 3, [[320, 0], [320, 300], [0, 335]]);
    line("#8497a5", 3, [[670, 0], [670, 300], [960, 365]]);
  }

  if (!shot.empty) {
    const scale = { "大特写": 4.9, "特写": 3.7, "近景": 2.6, "中景": 1.65, "全景": 1, "远景": .65 }[shot.scale];
    ctx.translate(shot.dialogue || shot.moving ? 368 : 480, shot.scale === "远景" ? 281 : 220);
    ctx.scale(scale, scale);
    ctx.fillStyle = "#263748";
    ctx.beginPath();
    ctx.ellipse(0, 0, 34, 41, 0, 0, Math.PI * 2);
    ctx.fill();
    line("#263748", 46, [[0, 61], [shot.moving ? -25 : 0, 143]]);
    if (shot.moving) {
      line("#263748", 15, [[0, 62], [47, 82], [74, 52]]);
      line("#263748", 15, [[-8, 66], [-50, 96], [-84, 80]]);
      line("#263748", 19, [[-25, 143], [31, 166], [56, 236]]);
      line("#263748", 19, [[-25, 143], [-64, 193], [-107, 212]]);
    } else {
      for (const side of [-1, 1]) {
        line("#263748", 16, [[side * 14, 64], [side * 44, 110], [side * 34, 149]]);
        line("#263748", 20, [[side * 11, 138], [side * 24, 191], [side * 28, 238]]);
      }
      line("#dce7ec", 3, [[6, -5], [21, -7]]);
    }
  }
  return canvas;
}
