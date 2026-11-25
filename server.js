"use strict";

const http = require("node:http");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { mkdtemp, writeFile, readFile, rm } = require("node:fs/promises");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

const run = promisify(execFile);
const host = "127.0.0.1:8765";
const assets = new Map([
  ["/", ["index.html", "text/html"]],
  ["/index.html", ["index.html", "text/html"]],
  ["/style.css", ["style.css", "text/css"]],
  ["/app.js", ["app.js", "text/javascript"]],
  ["/review.js", ["review.js", "text/javascript"]],
  ["/samples.js", ["samples.js", "text/javascript"]],
  ["/storyboard.js", ["storyboard.js", "text/javascript"]]
]);
const formats = new Set([".doc", ".docx", ".xls", ".xlsx"]);
const maxBytes = 20 * 1024 * 1024;
let busy = false;

function reply(res, status, body, type = "text/plain") {
  res.writeHead(status, { "Content-Type": type + "; charset=utf-8", "X-Content-Type-Options": "nosniff" });
  res.end(body);
}

http.createServer(async (req, res) => {
  if (req.headers.host !== host) return reply(res, 403, "地址无效。");
  const asset = assets.get(req.url);
  if (asset && req.method === "GET") {
    try {
      return reply(res, 200, await readFile(join(__dirname, asset[0])), asset[1]);
    } catch {
      return reply(res, 500, "无法读取应用文件。");
    }
  }
  if (req.url !== "/read-office" || req.method !== "POST") return reply(res, 404, "页面不存在。");
  if (req.headers.origin !== "http://" + host) return reply(res, 403, "请从本地应用导入文件。");

  const extension = req.headers["x-script-extension"];
  if (!formats.has(extension)) return reply(res, 415, "不支持该文件格式。");
  const length = Number(req.headers["content-length"]);
  if (!Number.isInteger(length) || length <= 0 || length > maxBytes) {
    return reply(res, 413, "请选择小于或等于 20 MB 的非空文件。");
  }
  if (busy) return reply(res, 503, "正在读取另一个文件，请稍后重试。");

  busy = true;
  let directory;
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    directory = await mkdtemp(join(tmpdir(), "storyboard-office-"));
    const path = join(directory, "script" + extension);
    await writeFile(path, Buffer.concat(chunks));
    const { stdout } = await run("powershell.exe", [
      "-NoProfile", "-NonInteractive", "-File", join(__dirname, "read-office.ps1"), path, extension
    ], { windowsHide: true, timeout: 45_000, maxBuffer: 8 * 1024 * 1024 });
    reply(res, 200, stdout);
  } catch {
    reply(res, 422, "无法读取文件。请确认已安装并初始化 Microsoft Word 或 Excel，且文件可打开、无密码保护。");
  } finally {
    if (directory) await rm(directory, { recursive: true, force: true }).catch(() => {});
    busy = false;
  }
}).listen(8765, "127.0.0.1", () => console.log("http://" + host));
