import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getMissingSmtpVars() {
  const missing = [];

  if (!process.env.SMTP_HOST) missing.push('SMTP_HOST');
  if (process.env.SMTP_USER && !process.env.SMTP_PASSWORD) missing.push('SMTP_PASSWORD');
  if (!process.env.SMTP_USER && process.env.SMTP_PASSWORD) missing.push('SMTP_USER');

  return missing;
}

function ensureSmtpReady(contexto) {
  const missing = getMissingSmtpVars();
  if (missing.length === 0) return true;

  const details = `Configuração SMTP incompleta (${missing.join(', ')}) durante ${contexto}.`;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(details);
  }

  console.warn(`${details} Envio de e-mail desativado neste ambiente.`);
  return false;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      }
    : undefined,
});

function loadTemplate(fileName) {
  const templatePath = path.join(__dirname, '..', 'public', 'pages', fileName);
  return fs.readFileSync(templatePath, 'utf8');
}

function renderTemplate(template, values) {
  return Object.entries(values).reduce((output, [key, value]) => {
    const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    return output.replace(pattern, String(value));
  }, template);
}

export async function enviarEmailBoasVindas({ email, nomeCompleto }) {
  if (!ensureSmtpReady('enviarEmailBoasVindas')) {
    console.log(`[SMTP desativado] Boas-vindas para ${email}`);
    return { skipped: true };
  }

  const html = renderTemplate(loadTemplate('welcomeTemplate.html'), {
    nome: nomeCompleto || 'usuário',
    linkBotao: process.env.APP_URL || '#',
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Bem-vindo ao HLS 2.0',
    html,
  });

  return { skipped: false };
}

export async function enviarCodigoVerificacao({ email, nomeCompleto, codigo, tipo = 'EmailVerification' }) {
  if (!ensureSmtpReady('enviarCodigoVerificacao')) {
    console.log(`[SMTP desativado] Código para ${email}: ${codigo}`);
    return { skipped: true };
  }

  const isPasswordReset = tipo === 'PasswordReset';
  const assunto = isPasswordReset
    ? 'Código de redefinição de senha HLS API'
    : 'Seu código de verificação HLS API';
  const html = isPasswordReset
    ? renderTemplate(loadTemplate('emailTemplate.html'), {
        validationCode: codigo,
        linkBotao: process.env.APP_URL || '#',
      })
    : renderTemplate(loadTemplate('codeVrifi.html'), {
        validationCode: codigo,
        nome: nomeCompleto || 'usuário',
      });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: assunto,
    html,
  });

  return { skipped: false };
}
