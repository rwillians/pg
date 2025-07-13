import { $, randomUUIDv7 } from 'bun';
import type { Context } from '../../context';
import { $command } from '../commands';
import { Certs } from '../../db/certs';

const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

const expiresIn = (certs: typeof Certs.infer) => {
  return certs.expiresAt.getTime() - Date.now();
};

const key = (ctx: Context) => `${ctx.config.PG_STATE_DIR}/server.key`;
const crt = (ctx: Context) => `${ctx.config.PG_STATE_DIR}/server.crt`;
const ca = (ctx: Context) => `${ctx.config.PG_STATE_DIR}/root.crt`;

const $md5 = async (path: string) => {
  return (await $`md5sum ${path}`.text())
    .split(' ')
    .shift()!
    .trim();
};

const issue = async (ctx: Context) => {
  const { config, db, logger, s3 } = ctx;

  const {
    TLS_SUBJECT_EXPIRY_DAYS: days,
    TLS_SUBJECT_COUNTRY: C,
    TLS_SUBJECT_STATE: ST,
    TLS_SUBJECT_LOCALITY: L,
    TLS_SUBJECT_ORGANIZATION: O,
    TLS_SUBJECT_ORGANIZATIONAL_UNIT: OU,
    TLS_SUBJECT_COMMON_NAME: CN,
    TLS_SUBJECT_EMAIL: email,
  } = config;

  const id = randomUUIDv7();
  const remoteKeyPath = `${config.S3_CERTS_PREFIX}/${id}.key`;
  const remoteCrtPath = `${config.S3_CERTS_PREFIX}/${id}.crt`;
  const remoteCaPath = `${config.S3_CERTS_PREFIX}/${id}.ca.crt`;

  logger.debug('Deleting old server TLS certificates');
  await $`rm ${key(ctx)} ${crt(ctx)} ${ca(ctx)}`.text();

  logger.info('Issuing new TLS certificates');
  await $`openssl req \
    -noenc \
    -new \
    -x509 \
    -days ${days} \
    -keyout ${key(ctx)} \
    -out ${crt(ctx)} \
    -subj "/C=${C}/ST=${ST}/L=${L}/O=${O}/OU=${OU}/CN=${CN}/emailAddress=${email}"`.text();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.valueOf() + (days * 24 * 60 * 60 * 1000));

  logger.debug('Setting permissions for server TLS certificates');
  await $`cp ${crt(ctx)} ${ca(ctx)}`.text();
  await $`chmod 400 ${key(ctx)}`.text();
  await $`chmod 444 ${crt(ctx)}`.text();
  await $`chmod 444 ${ca(ctx)}`.text();
  await $`chown ${config.POSTGRES_USER}:${config.POSTGRES_USER} ${key(ctx)} ${crt(ctx)} ${ca(ctx)}`.text();

  logger.debug('Uploading new server TLS certificates to S3');
  await s3.file(remoteKeyPath).write(Bun.file(key(ctx)));
  await s3.file(remoteCrtPath).write(Bun.file(crt(ctx)));
  await s3.file(remoteCaPath).write(Bun.file(ca(ctx)));

  logger.debug('Updating internal state');
  return Certs.insertOne(db, {
    key: remoteKeyPath,
    crt: remoteCrtPath,
    ca: remoteCaPath,
    md5: await $md5(crt(ctx)),
    createdAt,
    expiresAt,
  });
};

const resolve = async (ctx: Context) => {
  const { db } = ctx;

  const certs = await Certs.latestBy(db, 'expiresAt');

  if (!certs) return issue(ctx);
  if (expiresIn(certs) < ONE_WEEK) return issue(ctx);

  return certs;
};

export const certsInstall = $command({
  signature: 'install',
  describe: 'Installs the TLS certificates for PostgreSQL',
  handler: async (_argv, ctx) => {
    const { config, logger, s3 } = ctx;

    const certs = await resolve(ctx);
    if (await $md5(crt(ctx)) === certs.md5) return;

    logger.debug('Downloading TLS certificates from S3');
    await Bun.write(Bun.file(key(ctx)), s3.file(certs.key));
    await Bun.write(Bun.file(crt(ctx)), s3.file(certs.crt));
    await Bun.write(Bun.file(ca(ctx)), s3.file(certs.ca));

    logger.debug('Setting permissions for TLS certificates');
    await $`chmod 400 ${key(ctx)}`;
    await $`chmod 444 ${crt(ctx)}`;
    await $`chmod 444 ${ca(ctx)}`;
    await $`chown ${config.POSTGRES_USER}:${config.POSTGRES_USER} ${key(ctx)} ${crt(ctx)} ${ca(ctx)}`;

    logger.info('TLS certificates installed');
  },
})
