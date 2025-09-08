import { type Infer, t, table } from '../db-v2';

export const backups = table('backups', {
  id: t.id(),
  parentId: t.fk(),
  tar: t.custom.absolutePath(),
  manifest: t.custom.absolutePath(),
  size: t.custom.bytes(),
  startedAt: t.datetime(),
  completedAt: t.datetime(),
});

export type Backup = Infer<typeof backups>;
