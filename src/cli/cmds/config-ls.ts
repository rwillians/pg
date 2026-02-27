import { defineCommand, defineOptions, withContext } from '../cmd';
import { ascii } from '../../utils';

const SECRETS: string[] = [
  'POSTGRES_PASSWORD',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
];

const redacted = (value: string): string => {
  if (value.length < 10) return '••••••••';

  const visible = value.slice(0, 3);

  return `${visible}${'•'.repeat(value.length - 3)}`;
};

const options = defineOptions({
  redact: {
    describe: 'Redact secret values',
    type: 'boolean' as const,
    default: true,
  },
});

export const configLs = defineCommand(withContext({
  signature: 'ls',
  description: 'Lists all configuration values',
  build: cli => cli
    .option('redact', options.redact),
  handle: async (argv, ctx) => {
    const { config } = ctx;
    const { redact } = argv;

    const rows = Object.entries(config).map(([key, value]) => ({
      key,
      value: (redact && SECRETS.includes(key)) ? redacted(`${value}`) : `${value}`,
    }));

    const col = {
      key: Math.max(...rows.map(r => r.key.length)),
    };

    for (const row of rows) {
      const key = row.key.padEnd(col.key);

      process.stdout.write(`${ascii.dim(key)}  ${row.value}\n`);
    }
  },
}));
