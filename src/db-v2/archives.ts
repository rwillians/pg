import { type Infer, t, table } from '../lity';

export const archives = table('archives', {
  id: t.id(),
  tar: t.custom.absolutePath(),
  size: t.custom.bytes(),
  archivedAt: t.datetime(),
});

export type Archive = Infer<typeof archives>;
