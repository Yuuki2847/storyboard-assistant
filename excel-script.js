"use strict";

async function readExcelScript(file) {
  if (!file.size || file.size > 20 * 1024 * 1024) {
    throw new Error("请选择小于或等于 20 MB 的非空 Excel 文件。");
  }
  const reader = globalThis.XLSX;
  if (!reader) throw new Error("Excel 读取组件未加载。请确认 xlsx.full.min.js 已随页面发布。");
  let workbook;
  try {
    workbook = reader.read(await file.arrayBuffer(), { dense: true, cellHTML: false });
  } catch {
    throw new Error("无法读取 Excel 文件。请确认文件可打开且未加密。");
  }
  const sections = [];
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    const lines = [];
    for (const row of sheet?.["!data"] ?? []) {
      if (!row) continue;
      const line = row.map(cell => cell?.t === "e" ? "" : String(cell?.w ?? cell?.v ?? ""))
        .join("\t").trimEnd();
      if (line.trim()) lines.push(line);
    }
    if (lines.length) sections.push(`[${name}]\n${lines.join("\n")}`);
  }
  if (!sections.length) throw new Error("Excel 文件中没有可导入的单元格内容。");
  return sections.join("\n\n");
}
