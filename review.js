"use strict";

const landmarks = {
  subject: "主体视觉焦点", foreground: "前景", background: "背景",
  head: "头顶", neck: "颈根", pelvis: "骨盆中心",
  leftShoulder: "画面左肩", leftElbow: "画面左肘", leftWrist: "画面左腕",
  rightShoulder: "画面右肩", rightElbow: "画面右肘", rightWrist: "画面右腕",
  leftHip: "画面左髋", leftKnee: "画面左膝", leftAnkle: "画面左踝",
  rightHip: "画面右髋", rightKnee: "画面右膝", rightAnkle: "画面右踝"
};

const skeleton = [
  ["head", "neck", "pelvis"],
  ["neck", "leftShoulder", "leftElbow", "leftWrist"],
  ["neck", "rightShoulder", "rightElbow", "rightWrist"],
  ["pelvis", "leftHip", "leftKnee", "leftAnkle"],
  ["pelvis", "rightHip", "rightKnee", "rightAnkle"]
];

function assess(points, excerpt, focus, aspect) {
  const composition = [];
  const depth = [];
  const anatomy = [];
  const subject = points.subject;
  if (subject) {
    const thirds = [1 / 3, 2 / 3];
    const nearest = (value) => thirds.reduce((a, b) => Math.abs(value - a) <= Math.abs(value - b) ? a : b);
    if (Math.min(subject.x, 1 - subject.x, subject.y, 1 - subject.y) < .09) {
      composition.push("主体焦点贴近画缘。检查裁切是否有叙事目的，并沿视线或运动方向试留空间。");
    }
    if (Math.abs(subject.x - .5) < .1 && Math.abs(subject.y - .5) < .1) {
      composition.push("主体接近画面中心。可保留对称构图，或试把焦点移到三分交点以增加方向感。");
    } else {
      composition.push("最近的三分交点约在画幅宽 " + Math.round(nearest(subject.x) * 100) +
        "%、高 " + Math.round(nearest(subject.y) * 100) + "% 处。可对照网格比较主体位置。");
    }
  } else {
    composition.push("先标出观众应最先看到的位置，例如角色眼睛或关键道具。");
  }

  const inferred = /全景|远景|环境|同时看清/.test(excerpt) ? "deep"
    : /特写|虚化|浅景深|近景/.test(excerpt) ? "shallow" : "";
  const intent = focus === "auto" ? inferred : focus;
  if (focus === "auto" && inferred) depth.push("以下建议参考剧本关键词，可手动切换对焦意图。");
  if (intent === "shallow") depth.push("将焦点放在表演眼神或关键道具，给背景减弱线条和对比，并检查背景信息是否仍够用。");
  else if (intent === "deep") depth.push("保留前后景叙事信息的清晰度，用遮挡、尺度和明暗区分层次。");
  else depth.push("先明确观众需要同时读到哪些景层，再决定主体独立清晰还是前后景共同清晰。");
  if (!points.foreground || !points.background) depth.push("可分别标注前景和背景物，便于交代哪些物件需要保留细节。");

  const distance = (a, b) => Math.hypot((a.x - b.x) * aspect, a.y - b.y);
  const comparisons = [
    ["上臂", "Shoulder", "Elbow"], ["前臂", "Elbow", "Wrist"],
    ["大腿", "Hip", "Knee"], ["小腿", "Knee", "Ankle"]
  ];
  let comparable = 0;
  for (const [label, start, end] of comparisons) {
    const joints = [points["left" + start], points["left" + end],
      points["right" + start], points["right" + end]];
    if (!joints.every(Boolean)) continue;
    const left = distance(joints[0], joints[1]);
    const right = distance(joints[2], joints[3]);
    if (Math.max(left, right) < .001) {
      anatomy.push(label + "端点重合，请复核关节标注。");
      continue;
    }
    comparable++;
    if (Math.min(left, right) / Math.max(left, right) < .62) {
      anatomy.push("两侧" + label + "的画面投影长度差较大。核对透视缩短、遮挡和关节位置。");
    }
  }
  if (!comparable) anatomy.push("标出同一人物两侧对应的肢段端点，即可比较投影长度。遮挡点可留空。");
  else if (!anatomy.length) anatomy.push("已标注的对应肢段未触发长度差提示。可沿骨架检查动作线、支撑点和关节衔接。");
  return { "构图": composition, "景深": depth, "人体结构": anatomy };
}

if (typeof module !== "undefined") module.exports = { assess };
