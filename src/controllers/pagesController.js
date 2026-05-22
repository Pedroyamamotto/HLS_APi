import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function sendPage(res, fileName) {
  return res.sendFile(path.join(__dirname, '..', 'public', 'pages', fileName));
}

export function verifyPage(req, res) {
  return sendPage(res, 'verify.html');
}

export function verifiedPage(req, res) {
  return sendPage(res, 'verified.html');
}

export function userNotFoundPage(req, res) {
  return sendPage(res, 'user_not_found.html');
}

export function codeVerifyPage(req, res) {
  return sendPage(res, 'codeVrifi.html');
}

export function emailTemplatePage(req, res) {
  return sendPage(res, 'emailTemplate.html');
}

export function notFoundPage(req, res) {
  return res.status(404).sendFile(path.join(__dirname, '..', 'public', 'pages', '404.html'));
}

export function internalErrorPage(req, res) {
  return sendPage(res, '500.html');
}
