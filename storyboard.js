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
    const setting = scene + source;
    const location = /街道|马路|巷|街口/.test(setting) ? "街道"
      : /公园|山坡|森林|海边|外景|室外/.test(setting) ? "自然外景" : "室内";
    shots.push({ scene, text: source, scale, dialogue, location,
      action: moving ? "奔跑" : /坐下|坐在|坐着/.test(source) ? "坐姿" : /举起|举手|伸手/.test(source) ? "伸手" : "站姿",
      camera: /俯拍|俯视/.test(source) ? "俯拍" : /仰拍|仰视/.test(source) ? "仰拍" : "平视",
      placement: dialogue || moving ? "左侧" : "居中",
      prop: /手机|屏幕/.test(source) ? "手机" : /钥匙/.test(source) ? "钥匙" : "",
      empty: /空镜/.test(source),
      dark: /夜|月光/.test(setting) });
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

function drawStoryboardFrame(shot, canvas = document.createElement("canvas")) {
  const width = canvas.width = 1440;
  const height = canvas.height = 810;
  const ctx = canvas.getContext("2d");
  ctx.scale(1.5, 1.5);
  const night = shot.dark;
  const horizon = { "俯拍": 200, "平视": 309, "仰拍": 385 }[shot.camera];
  const vanishing = 510;
  const ink = "#202a32";
  const lit = night ? "#8895a6" : "#d7c2a4";
  const shadow = night ? "#273546" : "#70655c";

  function polygon(fill, points, stroke) {
    ctx.beginPath();
    for (const [x, y] of points) ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.25;
      ctx.stroke();
    }
  }

  function line(color, weight, points) {
    ctx.beginPath();
    for (const [x, y] of points) ctx.lineTo(x, y);
    ctx.strokeStyle = color;
    ctx.lineWidth = weight;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  function ellipse(x, y, rx, ry, color) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function gradient(x1, y1, x2, y2, a, b) {
    const fill = ctx.createLinearGradient(x1, y1, x2, y2);
    fill.addColorStop(0, a);
    fill.addColorStop(1, b);
    return fill;
  }

  ctx.fillStyle = gradient(0, 0, 0, horizon, night ? "#1b273e" : "#9dabb2", lit);
  ctx.fillRect(0, 0, 960, 540);
  ctx.fillStyle = gradient(0, horizon, 0, 540, lit, shadow);
  ctx.fillRect(0, horizon, 960, 540 - horizon);

  if (shot.location === "室内") {
    polygon(gradient(290, 0, 645, horizon, lit, shadow), [[270, 0], [700, 0], [660, horizon], [310, horizon]], ink);
    polygon(shadow, [[0, 0], [270, 0], [310, horizon], [0, horizon + 90]], ink);
    polygon(shadow, [[700, 0], [960, 0], [960, horizon + 102], [660, horizon]], ink);
    polygon(night ? "#617a97" : "#e9d4ab", [[42, 55], [239, 86], [252, horizon - 32], [42, horizon + 15]], ink);
    line(ink, 5, [[142, 72], [150, horizon - 9]]);
    line(ink, 4, [[42, horizon * .68], [245, horizon * .65]]);
    polygon(night ? "#9bb5c633" : "#f6dca264", [[42, horizon + 15], [252, horizon - 32], [660, 500], [415, 540]]);
    const door = [[552, horizon * .26], [632, horizon * .28], [632, horizon], [552, horizon]];
    polygon(shadow, door, ink);
    line(lit, 2, [[562, horizon - 3], [562, horizon * .31], [626, horizon * .33]]);
    ellipse(616, horizon * .68, 4, 4, lit);
    for (let x = -300; x <= 1350; x += 145) line("#27313d45", 1, [[vanishing, horizon], [x, 540]]);
    for (const f of [.12, .25, .43, .67, .92]) {
      const y = horizon + (540 - horizon) * f;
      line("#27313d40", 1, [[0, y], [960, y]]);
    }
  } else if (shot.location === "街道") {
    for (const side of [-1, 1]) {
      for (let n = 0; n < 6; n++) {
        const offset = 45 + 15 * n + 11 * n * n;
        const x = vanishing + side * offset;
        const y = horizon + offset * .23;
        const w = 27 + n * 20;
        const h = 45 + n * 44;
        ctx.fillStyle = gradient(x, y - h, x + w, y, lit, shadow);
        ctx.fillRect(x - w / 2, y - h, w, h);
        for (let row = 0; row < 4; row++) {
          ctx.fillStyle = night && (row + n) % 3 === 0 ? "#eacb91" : "#28384685";
          for (let col = 0; col < 3; col++) ctx.fillRect(x - w * .35 + col * w * .26, y - h * .86 + row * h * .19, w * .13, h * .11);
        }
      }
    }
    polygon("#40464c", [[vanishing - 22, horizon], [vanishing + 22, horizon], [893, 540], [121, 540]]);
    for (const f of [.1, .24, .43, .69]) {
      const y = horizon + (540 - horizon) * f;
      line("#d6c6a4", Math.max(1, f * 7), [[vanishing, y], [vanishing, y + f * 55]]);
    }
  } else {
    ellipse(728, Math.max(45, horizon - 155), 29, 29, night ? "#d6e4ed" : "#f5ddac");
    polygon(lit, [[0, horizon], [165, horizon - 118], [348, horizon - 15], [535, horizon - 96], [960, horizon + 10], [960, 540], [0, 540]]);
    ctx.beginPath();
    ctx.moveTo(0, horizon + 49);
    ctx.bezierCurveTo(289, horizon - 41, 638, horizon + 118, 960, horizon + 35);
    ctx.lineTo(960, 540);
    ctx.lineTo(0, 540);
    ctx.fillStyle = shadow;
    ctx.fill();
    for (const [x, y, size] of [[70, 482, 80], [136, 410, 51], [845, 408, 61], [911, 503, 91], [762, 373, 37]]) {
      line(ink, size * .09, [[x, y], [x + 4, y - size]]);
      for (const offset of [-.19, .02, .22]) ellipse(x + size * offset, y - size * (.84 + offset), size * .27, size * .35, "#34434a");
    }
  }

  if (!shot.empty) {
    const magnification = { "大特写": 5.2, "特写": 3.65, "近景": 2.32, "中景": 1.6, "全景": 1, "远景": .58 }[shot.scale];
    const x = { "左侧": 319, "居中": 480, "右侧": 641 }[shot.placement];
    const y = Math.min(502, horizon + 128);
    const sitting = shot.action === "坐姿";
    const running = shot.action === "奔跑";
    const reaching = shot.action === "伸手";
    const closeup = magnification > 2;
    const direction = shot.placement === "右侧" ? -1 : 1;
    const footY = sitting ? 169 : running ? 220 : 224;
    const headY = Math.max(155 + (horizon - 309) * .24, y - footY * magnification);
    if (!closeup) ellipse(x + 16, headY + footY * magnification + 5, 58 * magnification, 10 * magnification, "#11182052");
    ctx.save();
    ctx.translate(x, headY);
    ctx.scale(magnification * direction, magnification);
    const face = night ? "#ae9b8e" : "#dbad8e";
    const jacket = gradient(-32, 40, 37, 125, night ? "#647986" : "#81968e", "#323f49");
    const lean = running ? -13 : 0;

    if (sitting) {
      line(shadow, 7, [[-37, 117], [37, 117], [29, 172]]);
      line(shadow, 7, [[-31, 117], [-31, 170]]);
    }
    for (const [a, b, c] of sitting
      ? [[[-12, 110], [32, 120], [36, 166]], [[9, 109], [44, 124], [52, 169]]]
      : running
        ? [[[-15, 110], [26, 153], [38, 216]], [[-22, 110], [-57, 161], [-86, 185]]]
        : [[[-13, 110], [-18, 167], [-19, 218]], [[13, 111], [17, 166], [24, 218]]]) {
      line(ink, 19, [a, b, c]);
      line("#4e5a66", 12, [a, b, c]);
      line(ink, 9, [c, [c[0] + 14, c[1] + 4]]);
    }
    polygon(jacket, [[-16, 35], [-36, 49], [-28 + lean, 113], [25 + lean, 113], [35, 49], [14, 35]], ink);
    polygon("#b2b1a3", [[-12, 37], [0, 68], [14, 38]], ink);
    line("#202a3288", 1.4, [[0, 68], [lean, 112]]);
    const rightHand = reaching ? [76, 41] : running ? [69, 57] : shot.prop ? [35, 90] : [42, 110];
    line(ink, 18, [[-29, 53], [-45, 76], running ? [-74, 61] : [-40, 106]]);
    line(jacket, 13, [[-29, 53], [-45, 76], running ? [-74, 61] : [-40, 106]]);
    line(ink, 18, [[29, 53], [52, 83], rightHand]);
    line(jacket, 13, [[29, 53], [52, 83], rightHand]);
    ellipse(...rightHand, 7, 6, face);
    ellipse(0, 34, 12, 14, face);
    ellipse(0, -1, 25, 34, ink);
    ellipse(2, 3, 22, 30, face);
    polygon(ink, [[-22, 6], [-24, -16], [-12, -31], [10, -34], [24, -18], [20, -10], [8, -19], [-9, -10]]);
    line(ink, 1.4, [[-10, -4], [-4, -6], [0, -4]]);
    line(ink, 1.4, [[10, -5], [16, -6], [19, -4]]);
    line("#775e59", 1.2, [[7, 0], [10, 9], [6, 11]]);
    line("#775e59", 1.2, [[2, 18], [9, 19], [14, 17]]);
    if (shot.prop === "手机") {
      polygon(ink, [[rightHand[0] - 6, rightHand[1] - 2], [rightHand[0] + 10, rightHand[1] - 5],
        [rightHand[0] + 7, rightHand[1] - 31], [rightHand[0] - 9, rightHand[1] - 28]], "#a7d6d8");
    } else if (shot.prop === "钥匙") {
      ellipse(rightHand[0] + 8, rightHand[1], 4, 4, "#e0c280");
      line("#e0c280", 2, [[rightHand[0] + 8, rightHand[1]], [rightHand[0] + 14, rightHand[1] + 11], [rightHand[0] + 18, rightHand[1] + 9]]);
    }
    ctx.restore();
  }

  const shade = ctx.createRadialGradient(480, 260, 160, 480, 260, 575);
  shade.addColorStop(0, "#10182000");
  shade.addColorStop(1, "#10182083");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, width / 1.5, height / 1.5);
  return canvas;
}
