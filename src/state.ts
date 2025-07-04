import { type S3Client } from 'bun';
import { parse, stringify } from 'smol-toml';
import type { Logger } from './logger';
import { _, t, z } from './utils';

/**
 * @private
 */
const Backup = z.object({
  id: t.id(),
  parentId: t.id().nullable().default(null),
  tar: t.nen().startsWith('/'),
  manifest: t.nen().startsWith('/'),
  size: z.number().int().min(0),
  startedAt: z.coerce.date(),
  completedAt: z.coerce.date(),
});

/**
 * @private
 */
const Dump = z.object({
  id: t.id(),
  tar: t.nen().startsWith('/'),
  size: z.number().int().min(0),
  startedAt: z.coerce.date(),
  completedAt: z.coerce.date(),
});

/**
 * @private
 */
const CertSettings = z.object({
  key: t.absolutePath(),
  crt: t.absolutePath(),
  ca: t.absolutePath(),
  md5: z.string().length(32),
  expiresAt: z.coerce.date(),
});

/**
 * @private
 */
const State = z.object({
  version: z.literal(1),
  data: z.object({
    backups: z.record(t.nen(), Backup).default({}),
    dumps: z.record(t.nen(), Dump).default({}),
  }),
  sequences: z.object({
    backups: z.int().min(0).default(0),
    dumps: z.int().min(0).default(0),
  }),
  certs: CertSettings.optional(),
});

/**
 * @private
 */
const template = {
  version: 1,
  data: { backups: {}, dumps: {} },
  sequences: { backups: 0, dumps: 0 },
  certs: undefined,
};

const REGISTRY = {
  backups: Backup,
  dumps: Dump,
} as const;

type TCertSettings = z.infer<typeof CertSettings>;
type TState = z.infer<typeof State>;

const collection = <K extends keyof TState['data']>(state: TState, key: K, flush: () => Promise<void>) => ({
  all: async () => _.cloneDeep(Object.values(state.data[key])),
  find: async (id: string) => _.cloneDeep(state.data[key][id] ?? null),
  create: async (record: Omit<TState['data'][K][string], 'id'>) => {
    const id = String(++state.sequences[key]);
    state.data[key][id] = REGISTRY[key].parse({ ...record, id });

    await flush();

    return _.cloneDeep(state.data[key][id]);
  },
});

export const loadState = async (ctx: { s3: S3Client, logger: Logger }) => {
  const { s3, logger } = ctx;
  const file = s3.file('/state.toml');

  logger.debug('Loading state from S3');
  const raw = await file.exists()
    ? parse(await file.text())
    : template;

  logger.debug('Parsing state')
  const state = State.parse(raw);
  logger.debug('State loaded');

  const flush = async () => { await Bun.write(file, stringify(state) + '\n') };

  return {
    backups: collection(state, 'backups', flush),
    dumps: collection(state, 'dumps', flush),
    certs: {
      get: async () => state.certs ?? null,
      set: async (settings: TCertSettings) => {
        state.certs = CertSettings.parse(settings);
        await flush();
      },
    },
  };
};

export type State = Awaited<ReturnType<typeof loadState>>;
