// /api/send-mail.js
// Vercel Serverless Function (Gmail + Nodemailer + Busboy)
// ✅ multipart/form-data 지원 (첨부파일 최대 3개, 각 10MB)
// ✅ 정담/범푸드 문의 폼 필드(type, org 등) 메일 본문에 정리
// ✅ 프론트는 fetch("/api/send-mail", { method:"POST", body: FormData }) 로 호출

import nodemailer from "nodemailer";
import Busboy from "busboy";

export const config = {
  api: { bodyParser: false }, // multipart 처리 위해 off
};

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const bb = Busboy({
      headers: req.headers,
      limits: {
        files: 3,
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    });

    const fields = {};
    const files = [];

    bb.on("field", (name, val) => {
      // 같은 key가 여러 번 올 수도 있으니 마지막 값으로 덮어씀
      fields[name] = typeof val === "string" ? val.trim() : val;
    });

    bb.on("file", (fieldname, file, info) => {
      const { filename, mimeType } = info || {};
      const chunks = [];

      file.on("data", (d) => chunks.push(d));

      file.on("limit", () => {
        // fileSize 제한 초과
        reject(new Error("파일이 10MB 제한을 초과했습니다."));
      });

      file.on("end", () => {
        const buffer = Buffer.concat(chunks);
        if (buffer.length > 0) {
          files.push({
            fieldname,
            filename: filename || "attachment",
            contentType: mimeType || "application/octet-stream",
            content: buffer,
          });
        }
      });
    });

    bb.on("error", reject);
    bb.on("finish", () => resolve({ fields, files }));

    req.pipe(bb);
  });
}

function safe(v) {
  return (v ?? "").toString().trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, message: "POST only" });
  }

  try {
    const { fields, files } = await parseMultipart(req);

    // ✅ 문의 폼 필드 (정담 contact.html 기준)
    const name = safe(fields.name);
    const phone = safe(fields.phone);
    const email = safe(fields.email);
    const type = safe(fields.type); // 문의 유형
    const org = safe(fields.org);   // 회사/기관명(선택)
    const message = safe(fields.message);

    // (옵션) 너의 다른 폼에서 들어올 수 있는 값들 대비
    const subject = safe(fields.subject);      // 있으면 사용
    const company = safe(fields.company);      // 있으면 사용
    const region = safe(fields.region);        // 있으면 사용
    const filesLink = safe(fields.filesLink);  // 링크로 첨부(선택)

    const to = process.env.TO_EMAIL;
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!to) return res.status(500).json({ ok: false, message: "TO_EMAIL env missing" });
    if (!user) return res.status(500).json({ ok: false, message: "EMAIL_USER env missing" });
    if (!pass) return res.status(500).json({ ok: false, message: "EMAIL_PASS env missing" });

    // ✅ 최소 필수값 체크 (프론트에서도 체크하지만 서버에서도 안전하게)
    if (!name || !phone || !email || !type || !message) {
      return res.status(400).json({
        ok: false,
        message: "필수 항목 누락 (name/phone/email/type/message)",
      });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass }, // Gmail 앱 비밀번호
    });

    // 제목 구성 (subject가 있으면 우선)
    const mailSubject =
      subject
        ? `[JUNGDAM 문의] ${subject} | ${name} / ${phone}`
        : `[JUNGDAM 문의] ${type || "문의"} | ${name} / ${phone}`;

    // 본문 구성 (최대한 깔끔하게)
    const bodyLines = [
      "[문의 접수]",
      `- 문의 유형: ${type || "-"}`,
      `- 회사/기관명: ${org || company || "-"}`,
      region ? `- 지역: ${region}` : null,
      `- 성함: ${name || "-"}`,
      `- 연락처: ${phone || "-"}`,
      `- 이메일: ${email || "-"}`,
      filesLink ? `- 첨부 링크: ${filesLink}` : null,
      "",
      "[문의 내용]",
      message || "-",
    ].filter(Boolean);

    await transporter.sendMail({
      from: `"JUNGDAM Website" <${user}>`,
      to,
      subject: mailSubject,
      text: bodyLines.join("\n"),
      attachments: files.map((f) => ({
        filename: f.filename,
        content: f.content,
        contentType: f.contentType,
      })),
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);

    // 파일 제한 초과 등
    const msg = err?.message || "send failed";
    const status = msg.includes("10MB") ? 413 : 500;

    return res.status(status).json({ ok: false, message: msg });
  }
}
