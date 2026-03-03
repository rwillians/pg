import type { Sender } from '../sender';
import { Telegraf } from 'telegraf';
import { regex } from 'arkregex';

/**
 * @public Regex for Telegram connection string.
 * @since  18.0.1
 */
export const TELEGRAM_CONNECTION_STRING = regex('^telegram://(?<token>[^/]+)/(?<chatId>\\-?\\d+)$');

/**
 * @public Creates a Telegram sender instance.
 * @since  18.0.1
 */
export const createTelegramSender = async (url: string) => {
  const match = TELEGRAM_CONNECTION_STRING.exec(url);
  if (!match) throw new Error(`Expected Telegram's connection string to match \`/${TELEGRAM_CONNECTION_STRING.source}/\`, got \`${url}\``);

  const token = match.groups.token;
  const chatId = parseInt(match.groups.chatId, 10);

  const bot = new Telegraf(token);

  return {
    /**
     * @public Sends a message to the configured Telegram chat.
     * @since  18.0.1
     */
    send: async (message: string) => {
      await bot.telegram.sendMessage(chatId, message, { parse_mode: 'MarkdownV2' });
    },
  } satisfies Sender;
};
