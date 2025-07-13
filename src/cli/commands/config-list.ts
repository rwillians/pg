import { $command } from '../commands';
import { s } from '../../utils';

const REDACTED_FIELDS_INDEX: Record<string, boolean> = {
  POSTGRES_PASSWORD: true,
  S3_SECRET_ACCESS_KEY: true,
};

const redact = (key: string, value: unknown) => {
  if (!REDACTED_FIELDS_INDEX[key]) return value;
  if (typeof value !== 'string') return value;

  const stars = s.dim('**********');
  if (value.length < 10) return stars;

  const [first, ...rest] = value.split('');
  const last = rest.pop();

  return `${first}${stars}${last}`;
};

export const configList = $command({
  signature: 'ls',
  describe: 'Lists all configurations',
  handler: async (_argv, ctx) => {
    const { config } = ctx;

    const entries = Object
      .entries(config)
      .map(([key, value]) => ({ key, value: redact(key, value) }))
      .sort((a, b) => a.key.localeCompare(b.key));

    console.table(entries, ['key', 'value']);
  },
})
