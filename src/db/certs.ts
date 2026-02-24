import { table } from '@rwillians/qx';

export const certs = table('certs', t => ({
  id: t.integer().autoincrement().primaryKey(),
  key: t.string(),
  crt: t.string(),
  ca: t.string(),
  md5: t.string({ size: 32 }),
  createdAt: t.datetime(),
  expiresAt: t.datetime(),
}));

export type Cert = typeof certs.infer;
export type InsertCert = typeof certs.inferForInsert;
export type UpdateCert = typeof certs.inferForUpdate;
