import { defineCommand, withContext } from '../cmd';

export const notificationTest = defineCommand(withContext({
  signature: 'test',
  description: 'Sends a test notification',
  handle: async (_argv, ctx) => {
    const { notify } = ctx;

    await notify('This is a test notification from pg!');
  },
}));
