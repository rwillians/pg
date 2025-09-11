import { $command } from '../commands';
import { sleep } from '../../utils';

export const busybox = $command({
  signature: 'busybox',
  describe: 'Just keeps running doing nothing',
  handler: async () => {
    const ac = new AbortController();

    process
      .on('SIGINT', () => ac.abort())
      .on('SIGTERM', () => ac.abort())
      .on('SIGKILL', () => ac.abort());

    while (!ac.signal.aborted) {
      await sleep(1000);
    }
  },
});
