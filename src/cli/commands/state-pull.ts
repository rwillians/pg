import { $command } from '../commands';
import { s } from '../../utils';

const ISO8601 = /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})T(?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2}).*/;

export const statePull = $command({
  signature: 'pull',
  describe: 'Downloads pg\'s internal state database from S3',
  handler: async (_argv, ctx) => {
    const { config, logger, s3 } = ctx;

    const m = new Date().toISOString().match(ISO8601)!.groups! as any;
    const suffix = `${m.year}${m.month}${m.day}${m.hour}${m.minute}${m.second}`;

    const localPathSuffixed = `${config.PG_STATE_DIR}/db-${suffix}.sqlite`;
    const localPathDefault = `${config.PG_STATE_DIR}/db.sqlite`;

    const remoteFile = s3.file('/db.sqlite');
    const localFile = Bun.file(localPathSuffixed);

    logger.debug('Downloading state database');
    await Bun.write(localFile, remoteFile);

    logger.info(`
    State database successfully downloaded at ${s.blue(localPathSuffixed)}.

    If you want to make it your default state database, then rename it
    to ${s.red('db.sqlite')}.

      ${s.red(`mv ${localPathSuffixed} ${localPathDefault}`)}

    Be careful though, the state you downloaded might be older than
    your current state database.
    `.trim());
  },
});
