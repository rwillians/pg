import { model, t } from '../db';

export const Dump = model('dumps', {
  id: t.pk(),
  path: t.absolutePath(),
  size: t.bytes(),
  startedAt: t.datetime(),
  completedAt: t.datetime(),
});
