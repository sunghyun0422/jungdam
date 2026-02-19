const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const multer = require("multer");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: [
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ],
  })
);

// JSON도 사용 가능하게 유지 (다른 API 대비)
app.use(express.json());

// ✅ 파일 업로드 설정 (메모리 저장)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 3, // 최대 3개
  },
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// ✅ multipart/form-data 받기
app.post("/api/contact", upload.array("files", 3), async (req, res) => {
  try {
    // multipart는 req.body에 텍스트, req.files에 파일
    const {
      type,
      company,
      name,
      email,
      phone,
      region,
      subject,
      message,
      filesLink,
    } = req.body || {};

    const files = req.files || [];

    // 필수값 체크
    if (!type || !company || !name || !email || !subject || !message) {
      return res.status(400).json({ ok: false, error: "필수값 누락" });
    }

    // ✅ Gmail 앱비밀번호
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const toEmail = process.env.TO_EMAIL || process.env.SMTP_USER;

    const typeLabel =
      type === "partnership"
        ? "입점/제휴"
        : type === "b2b"
        ? "납품(B2B)"
        : type === "catering"
        ? "케이터링/행사"
        : type === "ops"
        ? "운영 협업/기타"
        : type;

    const mailSubject = `[BUMFOOD CONTACT] ${typeLabel} | ${subject}`;

    const text = `
[문의유형] ${typeLabel}
[회사/브랜드] ${company}
[담당자명] ${name}
[이메일] ${email}
[연락처] ${phone || "-"}
[운영 지역/채널] ${region || "-"}
[제목] ${subject}

[내용]
${message}

[자료 링크]
${filesLink || "-"}

[첨부파일]
${
  files.length
    ? files.map((f) => `${f.originalname} (${Math.round(f.size / 1024)}KB)`).join(", ")
    : "-"
}
`.trim();

    // ✅ 첨부파일을 nodemailer attachments로 변환
    const attachments = files.map((f) => ({
      filename: f.originalname,
      content: f.buffer,
      contentType: f.mimetype,
    }));

    await transporter.sendMail({
      from: `"BUMFOOD CONTACT" <${process.env.SMTP_USER}>`,
      to: toEmail,
      replyTo: email,
      subject: mailSubject,
      text,
      attachments,
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("메일 전송 실패:", err);
    return res.status(500).json({ ok: false, error: "메일 전송 실패" });
  }
});

// ✅ multer 에러를 JSON으로 보기 쉽게 반환
app.use((err, req, res, next) => {
  if (err && err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ ok: false, error: "파일이 너무 큽니다. (최대 10MB)" });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({ ok: false, error: "파일은 최대 3개까지 가능합니다." });
    }
    return res.status(400).json({ ok: false, error: `업로드 오류: ${err.code}` });
  }
  if (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({ ok: false, error: "서버 오류" });
  }
  next();
});

app.listen(PORT, () => {
  console.log(`🔥 Server running on http://localhost:${PORT}`);
});
