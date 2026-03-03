/**
 * @public An object that can send messages.
 * @since  18.0.1
 */
export type Sender = {
  /**
   * @public Sends a notification message.
   * @since  18.0.1
   */
  send: (message: string) => Promise<void>;
};
