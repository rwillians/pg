import type { Sender } from '../sender';

/**
 * @public Creates a sender that does nothing.
 * @since  18.0.1
 */
export const createNullSender = async (_url: string) => ({
  /**
   * @public Pretends to send a message.
   * @since  18.0.1
   */
  send: async (_message: string) => {},
} satisfies Sender);
