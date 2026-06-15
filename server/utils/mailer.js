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

async function sendPasswordResetEmail(to, prenom, pin) {
  await transporter.sendMail({
    from: `"Portail RH UGB-CROUS-SL" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject: 'Portail RH – Réinitialisation de votre mot de passe',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #333;">
        <div style="background: #7D3C00; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="color: #fff; margin: 0;">Portail RH UGB-CROUS-SL</h2>
        </div>
        <div style="background: #fafafa; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #eee;">
          <p>Bonjour <strong>${prenom}</strong>,</p>
          <p>Suite à votre demande, voici votre nouveau code PIN de premier accès :</p>
          <div style="background: #fff; border: 2px solid #7D3C00; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #7D3C00;">${pin}</span>
          </div>
          <p>Connectez-vous avec votre matricule et ce code PIN, puis définissez un nouveau mot de passe.</p>
          <p style="color: #888; font-size: 12px; margin-top: 24px;">
            Si vous n'avez pas demandé cette réinitialisation, ignorez cet email et contactez les RH.
          </p>
        </div>
      </div>
    `,
  });
}

async function sendMessageNotification(to, prenomRecipient, senderName, messageText) {
  await transporter.sendMail({
    from: `"Portail RH UGB-CROUS-SL" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject: `Portail RH – Nouveau message de ${senderName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #333;">
        <div style="background: #7D3C00; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="color: #fff; margin: 0;">Portail RH UGB-CROUS-SL</h2>
        </div>
        <div style="background: #fafafa; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #eee;">
          <p>Bonjour <strong>${prenomRecipient}</strong>,</p>
          <p>Vous avez reçu un nouveau message de <strong>${senderName}</strong> :</p>
          <div style="background: #fff; border-left: 4px solid #7D3C00; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; white-space: pre-wrap;">${messageText.substring(0, 500)}${messageText.length > 500 ? '…' : ''}</p>
          </div>
          <p>Connectez-vous sur le portail pour consulter et répondre.</p>
          <p style="color: #888; font-size: 12px; margin-top: 24px;">
            Cet email est envoyé automatiquement par le Portail RH.
          </p>
        </div>
      </div>
    `,
  });
}

async function sendBroadcastEmail(recipients, subject, body) {
  const bccList = recipients.map(r => r.email).join(', ');
  await transporter.sendMail({
    from: `"Portail RH UGB-CROUS-SL" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    bcc: bccList,
    subject: `Portail RH – ${subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #333;">
        <div style="background: #7D3C00; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="color: #fff; margin: 0;">Portail RH UGB-CROUS-SL</h2>
        </div>
        <div style="background: #fafafa; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #eee;">
          <h3 style="color: #7D3C00; margin-top: 0;">${subject}</h3>
          <div style="white-space: pre-wrap; line-height: 1.7;">${body}</div>
          <p style="color: #888; font-size: 12px; margin-top: 24px;">
            Connectez-vous sur le Portail RH pour plus de détails.
          </p>
        </div>
      </div>
    `,
  });
}

async function sendNewDeviceAlert(to, prenom, deviceLabel, ipAddress, loginTime) {
  const formatted = loginTime.toLocaleString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  await transporter.sendMail({
    from: `"Portail RH UGB-CROUS-SL" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject: 'Portail RH – Connexion depuis un nouvel appareil',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #333;">
        <div style="background: #7D3C00; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="color: #fff; margin: 0;">Portail RH UGB-CROUS-SL</h2>
        </div>
        <div style="background: #fafafa; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #eee;">
          <p>Bonjour <strong>${prenom}</strong>,</p>
          <p>Une connexion à votre compte a été détectée depuis un <strong>nouvel appareil</strong> :</p>
          <table style="width:100%; border-collapse:collapse; margin: 20px 0; background:#fff; border:1px solid #e0e0e0; border-radius:8px; overflow:hidden;">
            <tr style="background:#f5f5f5;">
              <td style="padding:10px 16px; font-weight:600; font-size:13px; color:#555; width:40%;">Appareil</td>
              <td style="padding:10px 16px; font-size:13px;">${deviceLabel}</td>
            </tr>
            <tr>
              <td style="padding:10px 16px; font-weight:600; font-size:13px; color:#555;">Adresse IP</td>
              <td style="padding:10px 16px; font-size:13px;">${ipAddress || 'Inconnue'}</td>
            </tr>
            <tr style="background:#f5f5f5;">
              <td style="padding:10px 16px; font-weight:600; font-size:13px; color:#555;">Date et heure</td>
              <td style="padding:10px 16px; font-size:13px;">${formatted}</td>
            </tr>
          </table>
          <div style="background:#fff8e1; border-left:4px solid #C68B2E; padding:14px 16px; border-radius:0 6px 6px 0; margin-bottom:16px;">
            <p style="margin:0; font-size:13px;">
              <strong>C'était vous ?</strong> Vous pouvez ignorer cet email en toute sécurité.
            </p>
          </div>
          <div style="background:#ffeaea; border-left:4px solid #d32f2f; padding:14px 16px; border-radius:0 6px 6px 0;">
            <p style="margin:0; font-size:13px;">
              <strong>Ce n'était pas vous ?</strong> Contactez immédiatement le service RH et changez votre mot de passe.
            </p>
          </div>
          <p style="color:#888; font-size:12px; margin-top:24px;">
            Cet email de sécurité est envoyé automatiquement par le Portail RH UGB-CROUS-SL.
          </p>
        </div>
      </div>
    `,
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendMessageNotification, sendBroadcastEmail, sendNewDeviceAlert };
