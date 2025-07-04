import { $ } from 'bun';
import { loadState } from '../../state';
import { $command } from '../commands';

export const rotateCerts = $command({
  signature: 'certs:rotate',
  describe: 'Rotates the server SSL certificates',
  handler: async (_argv, ctx) => {
    const { config, logger, s3 } = ctx;

    const {
      SSL_SUBJECT_EXPIRY_DAYS: days,
      SSL_SUBJECT_COUNTRY: C,
      SSL_SUBJECT_STATE: ST,
      SSL_SUBJECT_LOCALITY: L,
      SSL_SUBJECT_ORGANIZATION: O,
      SSL_SUBJECT_ORGANIZATIONAL_UNIT: OU,
      SSL_SUBJECT_COMMON_NAME: CN,
      SSL_SUBJECT_EMAIL: email,
    } = config;

    logger.info('Rotating server SSL certificates');
    const keyPath = `${config.PG_CERTS_DIR}/server.key`;
    const crtPath = `${config.PG_CERTS_DIR}/server.crt`;
    const caPath = `${config.PG_CERTS_DIR}/root.crt`;

    logger.debug('Deleting old server SSL certificates');
    await $`rm ${keyPath} ${crtPath} ${caPath}`.text();

    logger.debug('Generating new server SSL certificates');
    await $`openssl req \
      -noenc \
      -new \
      -x509 \
      -days ${days} \
      -keyout ${keyPath} \
      -out ${crtPath} \
      -subj "/C=${C}/ST=${ST}/L=${L}/O=${O}/OU=${OU}/CN=${CN}/emailAddress=${email}"`.text();
    const expiresAt = new Date(Date.now() + (days * 24 * 60 * 60 * 1000));

    logger.debug('Setting permissions for server SSL certificates');
    await $`cp ${crtPath} ${caPath}`.text();
    await $`chmod 400 ${keyPath}`.text();
    await $`chmod 444 ${crtPath}`.text();
    await $`chmod 444 ${caPath}`.text();
    await $`chown postgres:postgres ${keyPath} ${crtPath} ${caPath}`.text();

    logger.debug('Uploading new server SSL certificates to S3');
    await s3.file(keyPath).write(Bun.file(keyPath));
    await s3.file(crtPath).write(Bun.file(crtPath));
    await s3.file(caPath).write(Bun.file(caPath));

    const md5 = (await $`md5sum ${crtPath}`.text()).trim().split(' ')[0]!;
    logger.debug(`New SSL certificates MD5 checksum: ${md5}`);

    logger.debug('Updating internal state');
    const state = await loadState(ctx);
    await state.certs.set({
      key: keyPath,
      crt: crtPath,
      ca: caPath,
      md5,
      expiresAt,
    });

    logger.info('Server SSL certificates rotated successfully, make sure to restart PostgreSQL server to apply the changes');
  },
});
