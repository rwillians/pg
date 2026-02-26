import crypto from 'node:crypto';
import { rand } from './lodash';

/**
 * @private Single-word adjectives for random slug generation.
 * @since   18.0.0
 * @version 1
 */
const ADJECTIVES = [
  'red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink',
  'brown', 'black', 'white', 'gray', 'cyan', 'magenta', 'lime',
  'teal', 'indigo', 'violet', 'gold', 'silver', 'bronze', 'quick',
  'lazy', 'happy', 'sad', 'bright', 'dark', 'loud', 'silent', 'fast',
  'slow', 'strong', 'weak', 'brave', 'cowardly', 'clever', 'foolish',
  'kind', 'cruel', 'friendly', 'hostile', 'funny', 'serious',
  'generous', 'stingy', 'honest', 'deceitful', 'loyal', 'treacherous',
  'calm', 'anxious', 'confident', 'shy', 'ambitious',
];

/**
 * @private Single-word subjects for random slug generation.
 * @since   18.0.0
 * @version 1
 */
const SUBJECTS = [
  'apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape',
  'honeydew', 'kiwi', 'lemon', 'mango', 'nectarine', 'orange',
  'papaya', 'quince', 'raspberry', 'strawberry', 'tangerine',
  'fruit', 'voavanga', 'watermelon', 'xigua', 'zucchini', 'cat',
  'dog', 'elephant', 'tiger', 'lion', 'bear', 'wolf', 'fox', 'rabbit',
  'deer', 'giraffe', 'zebra', 'kangaroo', 'panda', 'monkey',
  'dolphin', 'shark', 'whale', 'eagle', 'owl', 'sparrow', 'parrot',
  'penguin', 'hamster', 'pig', 'cow', 'horse', 'sheep', 'goat',
  'chicken', 'duck', 'goose', 'turkey', 'hedgehog', 'squirrel',
  'raccoon', 'skunk', 'otter', 'beaver', 'moose', 'buffalo',
  'antelope', 'bison', 'camel', 'llama', 'alpaca', 'donkey',
];

/**
 * @public  Generates a URL-safe base64 strong secret of the specified
 *          length.
 * @since   18.0.0
 * @version 1
 */
export const secret = (len: number = 32) => crypto.randomBytes(~~(len * 1.5)).toString('base64url').slice(0, len);

/**
 * @public  Generates a random slug.
 * @since   18.0.0
 * @version 1
 */
export const slug = () => `${rand(ADJECTIVES)}-${rand(ADJECTIVES)}-${rand(SUBJECTS)}`;
