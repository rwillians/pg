import { model, t } from '../db';

export const Certs = model('certs', {
  id: t.pk(),
  key: t.absolutePath(),
  crt: t.absolutePath(),
  ca: t.absolutePath(),
  md5: t.string(32),
  createdAt: t.datetime(),
  expiresAt: t.datetime(),
});
