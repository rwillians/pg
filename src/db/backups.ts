import { type Infer, t, table } from '../db';

export const backups = table('backups', {
  id: t.id(),
  parentId: t.nullable(t.fk()),
  tar: t.custom.absolutePath(),
  manifest: t.custom.absolutePath(),
  size: t.custom.bytes(),
  startedAt: t.datetime(),
  completedAt: t.datetime(),
});

export type Backup = Infer<typeof backups>;
