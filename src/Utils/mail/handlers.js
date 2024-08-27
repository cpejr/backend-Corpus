import { html } from 'code-tag';

import sendEmail from './nodemailer.js';
import template from './template.js';

export function redefinePasswordEmail({ user, passwordToken }) {
    const body = html`
      <p>Olá, ${user.name}!</p>
      <p>
        Para alterar sua senha, favor clicar
        <a
          href="${`${
            process.env.FRONTEND_URL
          }/redefinir-senha/${encodeURIComponent(passwordToken)}`}"
          >aqui.</a
        >
      </p>
    `;
  
    const mailOptions = {
      to: user.email,
      subject: `[Corpus] - Confirmação de email`,
      text: `
      Olá, ${user.name}! Para finalizar a criação da sua conta, favor clicar aqui.
      `,
      html: template(body),
    };
  
    return sendEmail(mailOptions);
  }