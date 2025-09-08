import { type Infer, t, table } from '../db-v2';

export const certs = table('certs', {
  id: t.id(),
  key: t.custom.absolutePath(),
  crt: t.custom.absolutePath(),
  ca: t.custom.absolutePath(),
  md5: t.unique(t.string(32)),
  createdAt: t.datetime(),
  expiresAt: t.datetime(),
});

export type Cert = Infer<typeof certs>;
