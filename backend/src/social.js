// Recursos do cliente sem conta (identificado pelo celular salvo no aparelho):
// perfil e avatar e feedback.
import express from 'express';
import { prisma, HttpError, wrap, text, oneOf, image, mobile, limitLookup, notifyAdmins, formatPhone } from './util.js';

export const social = express.Router();

/** URL relativa do avatar do cliente (id opaco, nunca o número). */
export const avatarOf = (p) => (p?.avatarMime && p.avatarVersion ? `client-avatars/${p.id}?v=${p.avatarVersion}` : null);

export async function profilesByPhone(keys) {
  const list = [...new Set(keys.filter(Boolean))];
  if (!list.length) return new Map();
  const rows = await prisma.clientProfile.findMany({ where: { phoneKey: { in: list } } });
  return new Map(rows.map((r) => [r.phoneKey, r]));
}

const profileView = (p) => ({ name: p?.name || '', avatar: avatarOf(p) });

// ---------- Perfil e avatar ----------
social.get('/client-profile', wrap(async (req, res) => {
  limitLookup(`prof:${req.ip}`);
  const { key } = mobile(req.query.phone);
  res.json({ profile: profileView(await prisma.clientProfile.findUnique({ where: { phoneKey: key } })) });
}));

social.put('/client-profile', wrap(async (req, res) => {
  limitLookup(`prof:${req.ip}`);
  const { key } = mobile(req.body.phone);
  const name = text(req.body.name, 'Nome', { max: 100 });
  const p = await prisma.clientProfile.upsert({ where: { phoneKey: key }, update: { name }, create: { phoneKey: key, name } });
  res.json({ profile: profileView(p) });
}));

social.post('/client-profile/avatar', wrap(async (req, res) => {
  limitLookup(`avatar:${req.ip}`, 20);
  const { key } = mobile(req.body.phone);
  const { mime, data } = image(req.body.image);
  if (data.length > 600_000) throw new HttpError(413, 'Foto muito grande (máx. 600 KB)');
  const p = await prisma.clientProfile.upsert({
    where: { phoneKey: key },
    update: { avatar: data, avatarMime: mime, avatarVersion: { increment: 1 } },
    create: { phoneKey: key, avatar: data, avatarMime: mime, avatarVersion: 1 },
  });
  res.json({ profile: profileView(p) });
}));

social.delete('/client-profile/avatar', wrap(async (req, res) => {
  const { key } = mobile(req.body?.phone ?? req.query.phone);
  const p = await prisma.clientProfile.update({ where: { phoneKey: key }, data: { avatar: null, avatarMime: '' } }).catch(() => null);
  res.json({ profile: profileView(p) });
}));

social.get('/client-avatars/:id', wrap(async (req, res) => {
  const p = await prisma.clientProfile.findUnique({ where: { id: req.params.id }, select: { avatar: true, avatarMime: true } });
  if (!p?.avatar || !p.avatarMime) throw new HttpError(404, 'Sem foto');
  res.set('Content-Type', p.avatarMime).set('Cache-Control', 'public, max-age=31536000, immutable').send(Buffer.from(p.avatar));
}));

// ---------- Feedback ----------
const KINDS = ['elogio', 'sugestao', 'reclamacao', 'outro'];
const KIND_LABEL = { elogio: 'Elogio', sugestao: 'Sugestão', reclamacao: 'Reclamação', outro: 'Mensagem' };

social.post('/feedback', wrap(async (req, res) => {
  limitLookup(`fb:${req.ip}`, 10);
  const kind = oneOf(req.body.kind, 'Tipo', KINDS);
  const message = text(req.body.message, 'Mensagem', { required: true, max: 2000 });
  const name = text(req.body.name, 'Nome', { max: 100 });
  const key = req.body.phone ? mobile(req.body.phone).key : '';
  await prisma.feedback.create({ data: { kind, message, name, phoneKey: key } });
  await notifyAdmins(`Feedback: ${KIND_LABEL[kind]}`, `${name || (key ? formatPhone(key) : 'Anônimo')}: ${message.slice(0, 140)}`, '/admin/feedback');
  res.status(201).json({ ok: true });
}));
