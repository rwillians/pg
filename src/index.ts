import { connect, setup } from '@rwillians/sqlity';
import { createLogger } from './logger';
import { parseConfig } from './config';
import { genSlug } from './utils';

import * as Cluster from './services/cluster';

import { kv } from './db/kv';

(async () => {
  const config = parseConfig(process.env);

  const logger = createLogger({
    level: 'debug',
    // level: config.LOG_LEVEL,
    silent: config.NODE_ENV === 'test',
  });

  const db = await connect({ path: './db.sqlite', debug: logger.debug });
  await setup(db, [kv]);

  if (await Cluster.slug.get(db) === null) {
    const slug = await Cluster.slug.set(db, genSlug());
    logger.notice(`Generated new cluster slug: ${slug}`);
  }
})();
