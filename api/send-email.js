import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  const { to, subject, html, type } = req.body;

  try {
    let template;

    if (type === 'ots_confirmed') {
      template = `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
            <h1 style="color: white; margin: 0;">✅ Certificado Confirmado</h1>
          </div>

          <div style="padding: 40px; background: #f8f9fa;">
            <h2>Tu documento está confirmado en Bitcoin</h2>

            <p>Tu certificado <strong>${req.body.fileName}</strong> ha sido confirmado en la blockchain de Bitcoin.</p>

            <div style="background: white; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0;">
              <p><strong>Hash:</strong><br/>
              <code style="font-size: 12px;">${req.body.hash}</code></p>

              <p><strong>Bloque Bitcoin:</strong> ${req.body.blockHeight}</p>

              <p><strong>Timestamp:</strong> ${req.body.timestamp}</p>
            </div>

            <a href="https://verifysign.pro/dashboard"
               style="display: inline-block; background: #667eea; color: white; padding: 15px 30px;
                      text-decoration: none; border-radius: 5px; margin-top: 20px;">
              Ver en Dashboard
            </a>
          </div>

          <div style="padding: 20px; text-align: center; color: #666; font-size: 12px;">
            <p>VerifySign - Certificación Digital con Blockchain</p>
          </div>
        </body>
        </html>
      `;
    }

    const msg = {
      to: to,
      from: 'noreply@verifysign.pro',
      subject: subject,
      html: template || html
    };

    await sgMail.send(msg);

    return res.json({ success: true });

  } catch (error) {
    console.error('Email error:', error);
    return res.status(500).json({ error: error.message });
  }
}