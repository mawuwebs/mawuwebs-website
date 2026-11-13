import net from "node:net";
import http from "node:http";

/**
 * Test-only mail server. Accepts SMTP on :2525 and keeps every message in memory.
 * HTTP on :2526:  GET /messages -> JSON list,  DELETE /messages -> clear.
 * Lets the e2e tests assert on the emails the app really sends (recipient, subject, links in the body).
 */
type Msg = { from: string; to: string[]; subject: string; text: string };
const messages: Msg[] = [];

function decodeQP(s: string) {
  return Buffer.from(s.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/gi, (_m, h: string) => String.fromCharCode(parseInt(h, 16))), "latin1").toString("utf8");
}
function decodeWords(s: string) {
  return s.replace(/=\?UTF-8\?([QB])\?([^?]*)\?=/gi, (_m, enc: string, v: string) => (enc.toUpperCase() === "B" ? Buffer.from(v, "base64").toString("utf8") : decodeQP(v.replace(/_/g, " "))));
}
function parseHeaders(raw: string) {
  const out: Record<string, string> = {};
  for (const line of raw.replace(/\r?\n[ \t]+/g, " ").split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i > 0) out[line.slice(0, i).toLowerCase()] = line.slice(i + 1).trim();
  }
  return out;
}
function bodyText(headers: Record<string, string>, body: string): string {
  const ct = headers["content-type"] ?? "text/plain";
  const boundary = ct.match(/boundary="?([^";]+)"?/i)?.[1];
  if (boundary) {
    for (const part of body.split(`--${boundary}`)) {
      const idx = part.search(/\r?\n\r?\n/);
      if (idx < 0) continue;
      const h = parseHeaders(part.slice(0, idx));
      if ((h["content-type"] ?? "").toLowerCase().startsWith("text/plain") || (h["content-type"] ?? "").toLowerCase().includes("multipart")) {
        const t = bodyText(h, part.slice(idx).replace(/^\r?\n\r?\n/, ""));
        if (t) return t;
      }
    }
    return "";
  }
  const enc = (headers["content-transfer-encoding"] ?? "").toLowerCase();
  const b = body.replace(/\r?\n$/, "");
  if (enc === "quoted-printable") return decodeQP(b);
  if (enc === "base64") return Buffer.from(b, "base64").toString("utf8");
  return b;
}

net.createServer((sock) => {
  let buf = "";
  let data: string | null = null;
  let from = "";
  let to: string[] = [];
  const send = (s: string) => sock.write(`${s}\r\n`);
  send("220 sink ESMTP");
  sock.on("data", (chunk) => {
    buf += chunk.toString("latin1");
    for (;;) {
      if (data !== null) {
        const end = buf.indexOf("\r\n.\r\n");
        if (end < 0) return;
        data = buf.slice(0, end);
        buf = buf.slice(end + 5);
        const split = data.search(/\r?\n\r?\n/);
        const headers = parseHeaders(data.slice(0, split));
        messages.push({ from, to, subject: decodeWords(headers["subject"] ?? ""), text: bodyText(headers, data.slice(split).replace(/^\r?\n\r?\n/, "")) });
        data = null;
        from = ""; to = [];
        send("250 OK");
        continue;
      }
      const nl = buf.indexOf("\r\n");
      if (nl < 0) return;
      const line = buf.slice(0, nl);
      buf = buf.slice(nl + 2);
      const cmd = line.slice(0, 4).toUpperCase();
      if (cmd === "EHLO") { sock.write("250-sink\r\n250 8BITMIME\r\n"); }
      else if (cmd === "HELO") send("250 sink");
      else if (cmd === "MAIL") { from = line.replace(/^MAIL FROM:\s*/i, "").replace(/[<>]/g, "").split(" ")[0]; send("250 OK"); }
      else if (cmd === "RCPT") { to.push(line.replace(/^RCPT TO:\s*/i, "").replace(/[<>]/g, "").split(" ")[0]); send("250 OK"); }
      else if (cmd === "DATA") { data = ""; send("354 go"); }
      else if (cmd === "QUIT") { send("221 bye"); sock.end(); return; }
      else if (cmd === "RSET" || cmd === "NOOP") send("250 OK");
      else send("250 OK");
    }
  });
  sock.on("error", () => {});
}).listen(2525, "127.0.0.1");

http.createServer((req, res) => {
  if (req.url?.startsWith("/messages")) {
    if (req.method === "DELETE") { messages.length = 0; res.writeHead(204).end(); return; }
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(messages));
    return;
  }
  res.writeHead(200).end("ok");
}).listen(2526, "127.0.0.1");
