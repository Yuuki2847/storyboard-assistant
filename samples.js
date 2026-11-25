"use strict";

function cropWindow(subject, fraction, anchor) {
  const origin = (coordinate, target) => Math.max(0, Math.min(1 - fraction, coordinate - target * fraction));
  return { x: origin(subject.x, anchor.x), y: origin(subject.y, anchor.y), size: fraction };
}

function anatomyCandidate(points, aspect) {
  const distance = (a, b) => Math.hypot((a.x - b.x) * aspect, a.y - b.y);
  for (const [start, end, label] of [["Elbow", "Wrist", "前臂"], ["Knee", "Ankle", "小腿"]]) {
    const pairs = ["left", "right"].map(side => ({
      start: points[side + start], end: points[side + end]
    }));
    if (!pairs.every(pair => pair.start && pair.end)) continue;
    for (const pair of pairs) pair.length = distance(pair.start, pair.end);
    pairs.sort((a, b) => a.length - b.length);
    const [shorter, longer] = pairs;
    if (shorter.length < .001 || shorter.length / longer.length >= .62) continue;
    const factor = (1 + longer.length / shorter.length) / 2;
    const adjusted = {
      x: shorter.start.x + (shorter.end.x - shorter.start.x) * factor,
      y: shorter.start.y + (shorter.end.y - shorter.start.y) * factor
    };
    if (Object.values(adjusted).every(value => value >= 0 && value <= 1)) {
      return { ...shorter, adjusted, label };
    }
  }
  return null;
}

function makeSamples(shot) {
  const { image, points, focus, excerpt } = shot;
  const aspect = image.naturalWidth / image.naturalHeight;
  const width = Math.max(1, Math.round(Math.min(800, 800 * aspect, image.naturalWidth)));
  const height = Math.max(1, Math.round(width / aspect));
  const subject = points.subject ?? { x: .5, y: .5 };
  const provisional = points.subject ? "" : "暂以画面中心为主体，标注后可更新。";
  const thirds = value => value < .5 ? 1 / 3 : 2 / 3;

  function picture(crop = { x: 0, y: 0, size: 1 }) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(image,
      crop.x * image.naturalWidth, crop.y * image.naturalHeight,
      crop.size * image.naturalWidth, crop.size * image.naturalHeight, 0, 0, width, height);
    return canvas;
  }

  const composition = picture(cropWindow(subject, .78, { x: thirds(subject.x), y: thirds(subject.y) }));
  const samples = [{
    title: "构图 · 收紧画幅",
    description: "保留原宽高比，通过裁切减少周边留白，尽量让主体靠近三分交点。" + provisional,
    canvas: composition
  }];
  const keepContext = focus === "deep" || (focus === "auto" && /全景|远景|环境|同时看清/.test(excerpt));
  const depth = picture();
  if (keepContext) {
    samples.push({
      title: "景深 · 保留环境",
      description: "保留全幅和原有清晰度，与收紧版对照，检查前后景线索是否需要同时入画。",
      canvas: depth
    });
  } else {
    const mask = picture();
    const ctx = mask.getContext("2d");
    const x = subject.x * width;
    const y = subject.y * height;
    const radius = Math.min(width, height);
    const fade = ctx.createRadialGradient(x, y, radius * .13, x, y, radius * .48);
    fade.addColorStop(0, "transparent");
    fade.addColorStop(1, "black");
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, width, height);
    const output = depth.getContext("2d");
    output.filter = `blur(${Math.max(1, radius * .016)}px)`;
    output.drawImage(image, 0, 0, width, height);
    output.filter = "none";
    output.drawImage(mask, 0, 0);
    samples.push({
      title: "景深 · 突出主体",
      description: "以主体为清晰区，逐渐柔化周边，用于比较视觉重心。" + provisional,
      canvas: depth
    });
  }

  const candidate = anatomyCandidate(points, aspect);
  if (candidate) {
    const canvas = picture();
    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(2, Math.min(width, height) * .009);
    for (const [end, color] of [[candidate.adjusted, "#36eaff"], [candidate.end, "#ffb55c"]]) {
      ctx.strokeStyle = color;
      ctx.setLineDash(end === candidate.end ? [4, 5] : []);
      ctx.beginPath();
      ctx.moveTo(candidate.start.x * width, candidate.start.y * height);
      ctx.lineTo(end.x * width, end.y * height);
      ctx.stroke();
    }
    samples.push({
      title: "人体结构 · " + candidate.label + "调整示意",
      description: "橙色虚线是原标注，蓝线示意延伸较短一侧。请结合透视和遮挡判断是否采用。",
      canvas
    });
  }
  return samples;
}
