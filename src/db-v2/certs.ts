import { type Infer, t, table } from '../db-v2';

export const backups = table('backups', {
  id: t.id(),
  key: t.custom.absolutePath(),
  crt: t.custom.absolutePath(),
  ca: t.custom.absolutePath(),
  md5: t.string(32),
  createdAt: t.datetime(),
  expiresAt: t.datetime(),
});

export type Backup = Infer<typeof backups>;
