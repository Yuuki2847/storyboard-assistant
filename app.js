"use strict";

const ui = Object.fromEntries([...document.querySelectorAll("[id]")].map(el => [el.id, el]));
const shots = [];
let active;
const context = ui.canvas.getContext("2d");

for (const [key, label] of Object.entries(landmarks)) ui.point.add(new Option(label, key));

function render() {
  ui.canvas.hidden = !active;
  ui.placeholder.hidden = Boolean(active);
  ui.shot.disabled = ui.export.disabled = ui.png.disabled = ui.notes.disabled = !active;
  ui.remove.disabled = !active?.points[ui.point.value];
  ui.review.replaceChildren();
  ui.samples.hidden = !active;
  ui.samples.replaceChildren();
  if (!active) {
    ui.review.textContent = "导入一张草稿开始审阅。";
    return;
  }

  const { image, points } = active;
  const scale = Math.min(1, 2400 / Math.max(image.naturalWidth, image.naturalHeight));
  const width = ui.canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = ui.canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  context.drawImage(image, 0, 0, width, height);
  const unit = Math.max(1, Math.min(width, height) / 380);

  function line(a, b, color) {
    context.beginPath();
    context.moveTo(a.x * width, a.y * height);
    context.lineTo(b.x * width, b.y * height);
    context.strokeStyle = color;
    context.lineWidth = 2 * unit;
    context.stroke();
  }

  if (ui.grid.checked) {
    for (const position of [1 / 3, 2 / 3]) {
      line({ x: position, y: 0 }, { x: position, y: 1 }, "#ffe2a0b3");
      line({ x: 0, y: position }, { x: 1, y: position }, "#ffe2a0b3");
    }
  }
  for (const chain of skeleton) {
    for (let i = 1; i < chain.length; i++) {
      if (points[chain[i - 1]] && points[chain[i]]) line(points[chain[i - 1]], points[chain[i]], "#4decff");
    }
  }
  for (const [key, { x, y }] of Object.entries(points)) {
    const left = x * width;
    const top = y * height;
    context.beginPath();
    context.arc(left, top, 4 * unit, 0, Math.PI * 2);
    context.fillStyle = key === ui.point.value ? "#ffd36a" : "#4decff";
    context.fill();
    context.font = `${13 * unit}px sans-serif`;
    context.textAlign = x > .65 ? "right" : "left";
    const labelX = left + (x > .65 ? -7 : 7) * unit;
    const labelY = Math.max(15 * unit, top - 4 * unit);
    context.strokeStyle = "#101622";
    context.lineWidth = 3 * unit;
    context.strokeText(landmarks[key], labelX, labelY);
    context.fillText(landmarks[key], labelX, labelY);
  }

  for (const [title, suggestions] of Object.entries(getReview(active))) {
    const heading = document.createElement("h3");
    heading.textContent = title;
    ui.review.append(heading);
    for (const suggestion of suggestions) {
      const paragraph = document.createElement("p");
      paragraph.textContent = suggestion;
      ui.review.append(paragraph);
    }
  }
  renderSamples(active);
}

function renderSamples(shot) {
  const heading = document.createElement("h2");
  heading.textContent = "修改样图";
  ui.samples.append(heading);
  for (const [index, sample] of makeSamples(shot).entries()) {
    const card = document.createElement("figure");
    const title = document.createElement("h3");
    title.textContent = sample.title;
    sample.canvas.setAttribute("aria-label", sample.title);
    const caption = document.createElement("figcaption");
    caption.textContent = sample.description;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "下载样图";
    button.addEventListener("click", () => {
      const name = shot.name.replace(/\.[^.]+$/, "");
      sample.canvas.toBlob(blob => {
        if (blob) download(blob, `${name}-sample-${index + 1}.png`);
        else ui.status.textContent = "无法生成样图 PNG。";
      }, "image/png");
    });
    card.append(title, sample.canvas, caption, button);
    ui.samples.append(card);
  }
}

function getReview(shot) {
  return assess(shot.points, shot.excerpt, shot.focus, shot.image.naturalWidth / shot.image.naturalHeight);
}

function selectShot(index) {
  active = shots[index];
  ui.shot.value = String(index);
  ui.excerpt.value = active.excerpt;
  ui.focus.value = active.focus;
  ui.notes.value = active.notes;
  render();
}

ui.script.addEventListener("change", async () => {
  const file = ui.script.files[0];
  if (!file) return;
  const target = active;
  const forDrawing = !ui.drawWorkspace.hidden;
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  ui.script.disabled = true;
  ui.importStatus.textContent = "正在读取剧本…";
  try {
    let contents;
    if (extension === ".txt" || extension === ".md") {
      contents = await file.text();
    } else if (extension === ".xls" || extension === ".xlsx") {
      contents = await readExcelScript(file);
    } else {
      const setup = "请在项目目录运行 node server.js，再用 Edge 或 Chrome 打开 http://127.0.0.1:8765/。";
      if (location.origin !== "http://127.0.0.1:8765") {
        throw new Error("当前页面未连接本机 Office 读取服务。" + setup);
      }
      let response;
      try {
        response = await fetch("/read-office", {
          method: "POST", headers: { "X-Script-Extension": extension }, body: file
        });
      } catch {
        throw new Error("无法连接本机 Office 读取服务。" + setup);
      }
      if (response.headers.get("X-Storyboard-Office") !== "1") {
        throw new Error(`当前页面未接通 Office 读取接口（HTTP ${response.status}）。` + setup);
      }
      contents = await response.text();
      if (!response.ok) throw new Error(contents);
    }
    if (forDrawing) {
      ui.storyText.value = contents;
    } else {
      const destination = target ?? active;
      if (destination) destination.excerpt = contents;
      if (destination === active) ui.excerpt.value = contents;
      render();
    }
    ui.importStatus.textContent = "已读取剧本 " + file.name;
  } catch (error) {
    ui.importStatus.textContent = error.message || "无法读取剧本文件。";
  } finally {
    ui.script.value = "";
    ui.script.disabled = false;
  }
});

ui.images.addEventListener("change", async () => {
  const files = [...ui.images.files];
  let failed = 0;
  let firstIndex;
  const excerpt = ui.excerpt.value;
  const focus = ui.focus.value;
  ui.images.disabled = true;
  for (const file of files) {
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const index = shots.length;
      shots.push({ name: file.name, image, points: {}, excerpt, focus, notes: "" });
      ui.shot.add(new Option(file.name, String(index)));
      firstIndex ??= index;
    } catch {
      failed++;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  if (!active && firstIndex !== undefined) selectShot(firstIndex);
  ui.status.textContent = `本次导入 ${files.length - failed} 张草稿` + (failed ? `，${failed} 张无法读取。` : "。");
  ui.images.value = "";
  ui.images.disabled = false;
});

ui.shot.addEventListener("change", () => selectShot(Number(ui.shot.value)));
for (const field of ["excerpt", "focus", "notes"]) {
  ui[field].addEventListener("input", () => {
    if (!active) return;
    active[field] = ui[field].value;
    if (field !== "notes") render();
  });
}
ui.grid.addEventListener("change", render);
ui.point.addEventListener("change", render);
ui.canvas.addEventListener("click", event => {
  if (!active) return;
  const rect = ui.canvas.getBoundingClientRect();
  const clamp = value => Math.max(0, Math.min(1, value));
  active.points[ui.point.value] = {
    x: clamp((event.clientX - rect.left) / rect.width),
    y: clamp((event.clientY - rect.top) / rect.height)
  };
  render();
});
ui.remove.addEventListener("click", () => {
  delete active.points[ui.point.value];
  render();
});

function download(blob, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

ui.export.addEventListener("click", () => {
  const report = shots.map(({ image, ...shot }, index) => ({
    shot: index + 1, ...shot, width: image.naturalWidth, height: image.naturalHeight,
    suggestions: getReview(shots[index])
  }));
  download(new Blob([JSON.stringify({ version: 1, shots: report }, null, 2)],
    { type: "application/json" }), "storyboard-review.json");
});
ui.png.addEventListener("click", () => {
  const filename = active.name.replace(/\.[^.]+$/, "") + "-review.png";
  ui.canvas.toBlob(blob => {
    if (blob) download(blob, filename);
    else ui.status.textContent = "无法生成标注 PNG。";
  }, "image/png");
});
for (const drawing of [false, true]) {
  const button = drawing ? ui.drawMode : ui.reviewMode;
  button.addEventListener("click", () => {
    ui.drawWorkspace.hidden = !drawing;
    ui.reviewWorkspace.hidden = drawing;
    ui.drawMode.setAttribute("aria-pressed", String(drawing));
    ui.reviewMode.setAttribute("aria-pressed", String(!drawing));
  });
}

ui.generateShots.addEventListener("click", () => {
  const shots = planStoryboard(ui.storyText.value);
  ui.generatedShots.replaceChildren();
  ui.generationStatus.textContent = shots.length
    ? `已生成 ${Math.min(60, shots.length)} 张示意分镜。` + (shots.length > 60 ? "可分段生成其余镜头。" : "")
    : "请导入或粘贴含有动作、台词或镜头内容的剧本。";
  for (const [index, shot] of shots.slice(0, 60).entries()) {
    const card = document.createElement("figure");
    const title = document.createElement("h3");
    title.textContent = `镜头 ${index + 1} · ${shot.scale}` + (shot.scene ? ` · ${shot.scene}` : "");
    const frame = drawStoryboardFrame(shot);
    frame.setAttribute("aria-label", title.textContent);
    const caption = document.createElement("figcaption");
    caption.textContent = shot.text;
    const button = document.createElement("button");
    button.textContent = "下载分镜 PNG";
    button.addEventListener("click", () => frame.toBlob(blob => {
      if (blob) download(blob, `storyboard-${index + 1}.png`);
      else ui.generationStatus.textContent = "无法生成分镜 PNG。";
    }));
    const controls = document.createElement("div");
    controls.className = "frame-controls";
    for (const [key, label, options] of [
      ["scale", "景别", ["远景", "全景", "中景", "近景", "特写", "大特写"]],
      ["camera", "机位", ["平视", "俯拍", "仰拍"]],
      ["placement", "主体位置", ["左侧", "居中", "右侧"]],
      ["action", "人物动作", ["站姿", "坐姿", "伸手", "奔跑"]],
      ["location", "场景", ["室内", "街道", "自然外景"]]
    ]) {
      if (shot.empty && ["placement", "action"].includes(key)) continue;
      const field = document.createElement("label");
      field.textContent = label;
      const select = document.createElement("select");
      for (const option of options) select.add(new Option(option, option));
      select.value = shot[key];
      select.addEventListener("change", () => {
        shot[key] = select.value;
        title.textContent = `镜头 ${index + 1} · ${shot.scale}` + (shot.scene ? ` · ${shot.scene}` : "");
        frame.setAttribute("aria-label", title.textContent);
        drawStoryboardFrame(shot, frame);
      });
      field.append(select);
      controls.append(field);
    }
    card.append(title, frame, caption, controls, button);
    ui.generatedShots.append(card);
  }
});
render();
