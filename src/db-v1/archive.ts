import { model, t } from '../db-v1';

export const Archive = model('wal_archives', {
  id: t.pk(),
  tar: t.absolutePath(),
  size: t.bytes(),
  archivedAt: t.datetime(),
});
