import { type Infer, t, table } from '../lity';

export const dumps = table('dumps', {
  id: t.id(),
  path: t.custom.absolutePath(),
  size: t.custom.bytes(),
  startedAt: t.datetime(),
  completedAt: t.datetime(),
});

export type Dump = Infer<typeof dumps>;
