const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendVerificationEmail(to, prenom, code) {
  await transporter.sendMail({
    from: `"Portail RH UGB-CROUS-SL" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject: 'Portail RH – Code de vérification',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #333;">
        <div style="background: #7D3C00; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="color: #fff; margin: 0;">Portail RH UGB-CROUS-SL</h2>
        </div>
        <div style="background: #fafafa; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #eee;">
          <p>Bonjour <strong>${prenom}</strong>,</p>
          <p>Voici votre code de vérification pour finaliser votre inscription :</p>
          <div style="background: #fff; border: 2px solid #7D3C00; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
            <span style="font-size: 40px; font-weight: bold; letter-spacing: 12px; color: #7D3C00;">${code}</span>
          </div>
          <p>Ce code expire dans <strong>15 minutes</strong>.</p>
          <p style="color: #888; font-size: 12px; margin-top: 24px;">
            Si vous n'avez pas demandé cette inscription, ignorez cet email.
          </p>
        </div>
      </div>
    `,
  });
}

module.exports = { sendVerificationEmail };
