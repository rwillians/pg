import { createTelegramSender } from './notifications/senders/telegram';
import { createNullSender } from './notifications/senders/null';
import type { Backup } from './db/tables/backups';
import type { Logger } from './logger';
import { fmt, never } from './utils';

type BackupCompleted = {
  kind: 'backup-completed';
  backup: Backup;
};

type Event = BackupCompleted;
type Notifiable = BackupCompleted | string;

const formatBackupCompleted = ({ backup }: BackupCompleted) => [
  `Backup ${backup.id} completed\\!\n`,
  '\n',
  '```txt\n',
  `type: ${backup.parentId ? 'incremental' : 'full'}\n`,
  `took: ${fmt.took(backup.startedAt, backup.completedAt)}\n`,
  `size: ${fmt.size(backup.size)}\n`,
  '```\n'
].join('');

const is = {
  backupCompleted: (value: Notifiable): value is BackupCompleted => (value as any).kind === 'backup-completed',
};

const SENDERS = [
  { test: (url: string) => url.startsWith('telegram://'), create: createTelegramSender },
  { test: () => true, create: createNullSender },
];

/**
 * @public Creates a notifier instance.
 * @since  18.0.1
 */
export const createNotifier = async (connectionString: string | undefined, log: Logger) => {
  const url = connectionString ?? '';

  const { create } = SENDERS.find(({ test }) => test(url)) || never();
  const sender = await create(url);

  return {
    /**
     * @public Notifies about an event.
     * @since  18.0.1
     */
    notify: async (payload: Event | string) => {
      const msg =
        is.backupCompleted(payload) ? formatBackupCompleted(payload)
      : typeof payload === 'string' ? payload
      : never();

      return sender.send(msg).catch(log.error);
    },
  };
};

/**
 * @public Notifier's public interface.
 * @since  18.0.1
 */
export type Notifier = Awaited<ReturnType<typeof createNotifier>>;
