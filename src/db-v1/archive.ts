import { model, t } from '../db';

export const Archive = model('wal_archives', {
  id: t.pk(),
  tar: t.absolutePath(),
  size: t.bytes(),
  archivedAt: t.datetime(),
});
