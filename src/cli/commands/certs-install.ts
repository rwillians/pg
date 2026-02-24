import { from, expr, into } from '@rwillians/qx';
import { $, randomUUIDv7 } from 'bun';

import { contextualized, defineCommand } from '../command';
import type { Context } from '../../context';
import { noop, timeLeft } from '../../utils';
import { certs } from '../../db';

const ONE_MONTH = 30 * 24 * 60 * 60 * 1000;

const issue = async (ctx: Context) => {
  const { config, db, fs, logger } = ctx;

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

  const name = randomUUIDv7();

  const files = {
    local: {
      key: fs.local.file('server.key'),
      crt: fs.local.file('server.crt'),
      ca: fs.local.file('server.ca.crt'),
    },
    s3: {
      key: fs.s3.certs.file(`${name}.key`),
      crt: fs.s3.certs.file(`${name}.crt`),
      ca: fs.s3.certs.file(`${name}.ca.crt`),
    },
  };

  logger.debug('Deleting old server TLS certificates');
  await files.local.key.unlink().catch(noop);
  await files.local.crt.unlink().catch(noop);
  await files.local.ca.unlink().catch(noop);

  logger.info('Issuing new TLS certificates');
  await $`openssl req \
    -noenc \
    -new \
    -x509 \
    -days ${days} \
    -keyout ${files.local.key.name} \
    -out ${files.local.crt.name} \
    -subj "/C=${C}/ST=${ST}/L=${L}/O=${O}/OU=${OU}/CN=${CN}/emailAddress=${email}"`.text();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.valueOf() + (days * 24 * 60 * 60 * 1000) - 1000);

  logger.debug('Setting permissions for server TLS certificates');
  await $`cp ${files.local.crt.name} ${files.local.ca.name}`.text();

  logger.debug('Uploading new server TLS certificates to S3');
  await files.s3.key.write(files.local.key);
  await files.s3.crt.write(files.local.crt);
  await files.s3.ca.write(files.local.ca);

  logger.debug('Updating internal state');
  const [cert] = await into(certs)
    .values({
      key: files.s3.key.name!,
      crt: files.s3.crt.name!,
      ca: files.s3.ca.name!,
      md5: (await fs.local.md5(files.local.crt))!,
      createdAt,
      expiresAt,
    })
    .insert(db);

  return cert!;
};

const resolve = async (ctx: Context) => {
  const { db } = ctx;
  const now = new Date();

  const cert = await from(certs.as('c'))
    .where(({ c }) => expr.gt(c.expiresAt, now))
    .orderBy(({ c }) => [expr.desc(c.expiresAt)])
    .one(db);

  if (!cert) return issue(ctx);
  if (timeLeft(cert.expiresAt) < ONE_MONTH) return issue(ctx);

  return cert;
};

export const certsInstall = defineCommand(contextualized({
  signature: 'install',
  description: 'Installs self-signed TLS certificates',
  handle: async (_argv, ctx) => {
    const { config, logger, fs } = ctx;
    const crt = fs.local.file('server.crt');

    const cert = await resolve(ctx);
    if (await fs.local.md5(crt) === cert.md5) return;

    const files = {
      local: {
        key: fs.local.file('server.key'),
        crt: fs.local.file('server.crt'),
        ca: fs.local.file('server.ca.crt'),
      },
      s3: {
        key: fs.s3.certs.file(cert.key),
        crt: fs.s3.certs.file(cert.crt),
        ca: fs.s3.certs.file(cert.ca),
      },
    };

    logger.info('Downloading TLS certificates from S3');
    await Bun.write(files.local.key, files.s3.key);
    await Bun.write(files.local.crt, files.s3.crt);
    await Bun.write(files.local.ca, files.s3.ca);

    logger.debug('Setting permissions for TLS certificates');
    await $`chmod 400 ${files.local.key.name}`.text();
    await $`chmod 444 ${files.local.crt.name}`.text();
    await $`chmod 444 ${files.local.ca.name}`.text();
    await $`chown ${config.USER}:${config.USER} ${files.local.key.name} ${files.local.crt.name} ${files.local.ca.name}`.text();

    logger.info('TLS certificates installed');
  },
}));
