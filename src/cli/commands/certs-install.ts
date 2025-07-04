import { $ } from 'bun';
import type { Context } from '../../context';
import { loadState } from '../../state';
import { $command } from '../commands';

const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

const downloadCerts = async (ctx: Context) => {
  const { config, logger, s3 } = ctx;

  const localKey = `${config.PG_CERTS_DIR}/server.key`;
  const localCrt = `${config.PG_CERTS_DIR}/server.crt`;
  const localCa = `${config.PG_CERTS_DIR}/root.crt`;

  const localKeyFile = Bun.file(localKey);
  const localCrtFile = Bun.file(localCrt);
  const localCaFile = Bun.file(localCa);
  const remoteKeyFile = s3.file(localKey);
  const remoteCrtFile = s3.file(localCrt);
  const remoteCaFile = s3.file(localCa);

  logger.debug('Downloading SSL certificates from S3');
  await Bun.write(localKeyFile, remoteKeyFile);
  await Bun.write(localCrtFile, remoteCrtFile);
  await Bun.write(localCaFile, remoteCaFile);

  logger.debug('Setting permissions for SSL certificates');
  await $`chmod 400 ${localKey}`;
  await $`chmod 444 ${localCrt}`;
  await $`chmod 444 ${localCa}`;
  await $`chown postgres:postgres ${localKey} ${localCrt} ${localCa}`;

  logger.debug('SSL certificates downloaded');
};

export const installCerts = $command({
  signature: 'certs:install',
  describe: 'Installs the SSL certificates for PostgreSQL',
  handler: async (_argv, ctx) => {
    const { config } = ctx;

    const state = await loadState(ctx);
    const certs = await state.certs.get();

    if (!certs) return $`pg certs:rotate`.then(() => {});
    if (certs.expiresAt.getTime() - Date.now() < ONE_WEEK) return $`pg certs:rotate`.then(() => {});
    if (!await Bun.file(`${config.PG_CERTS_DIR}/server.crt`).exists()) return downloadCerts(ctx);

    const md5 = (await $`md5sum ${config.PG_CERTS_DIR}/server.crt`.text()).trim().split(' ')[0]!;
    if (certs.md5 !== md5) return downloadCerts(ctx);
  },
})
