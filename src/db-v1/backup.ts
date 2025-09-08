import { model, t } from '../db-v1';

export const Backup = model('backups', {
  id: t.pk(),
  parentId: t.nullable.fk(),
  tar: t.absolutePath(),
  manifest: t.absolutePath(),
  size: t.bytes(),
  startedAt: t.datetime(),
  completedAt: t.datetime(),
});
