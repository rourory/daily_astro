// lib/email.ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true, // true для 465, false для других портов
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendOtpEmail(email: string, code: string) {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 0; }
        .container { max-width: 480px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { background-color: #000000; padding: 24px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 600; }
        .content { padding: 32px 24px; text-align: center; }
        .text { color: #52525b; font-size: 16px; line-height: 1.5; margin-bottom: 24px; }
        .code-box { background-color: #f4f4f5; border-radius: 12px; padding: 16px; margin: 0 auto 24px; display: inline-block; }
        .code { font-family: 'Courier New', monospace; font-size: 32px; font-weight: 700; letter-spacing: 4px; color: #18181b; }
        .footer { padding: 24px; text-align: center; color: #a1a1aa; font-size: 12px; border-top: 1px solid #f4f4f5; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Daily Astro 🔮</h1>
        </div>
        <div class="content">
          <p class="text">Ваш код для входа и подтверждения почты:</p>
          <div class="code-box">
            <span class="code">${code}</span>
          </div>
          <p class="text" style="font-size: 14px; color: #71717a;">
            Код действителен в течение 15 минут.<br>
            Если вы не запрашивали этот код, просто проигнорируйте это письмо.
          </p>
        </div>
        <div class="footer">
          © ${new Date().getFullYear()} Daily Astro Belarus. Все права защищены.
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"Daily Astro" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Ваш код подтверждения: ${code}`,
    html: htmlContent,
  });
}