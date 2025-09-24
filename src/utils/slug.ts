const ADJECTIVES = [
  'red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink',
  'brown', 'black', 'white', 'gray', 'cyan', 'magenta', 'lime', 'teal',
  'indigo', 'violet', 'gold', 'silver', 'bronze', 'quick', 'lazy',
  'happy', 'sad', 'bright', 'dark', 'loud', 'silent', 'fast', 'slow',
  'strong', 'weak', 'brave', 'cowardly', 'clever', 'foolish', 'kind',
  'cruel', 'friendly', 'hostile',
];

const SUBJECTS = [
  'apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape',
  'honeydew', 'kiwi', 'lemon', 'mango', 'nectarine', 'orange', 'papaya',
  'quince', 'raspberry', 'strawberry', 'tangerine', 'ugli fruit',
  'voavanga', 'watermelon', 'xigua', 'yellow passion fruit', 'zucchini',
  'cat', 'dog', 'elephant', 'tiger', 'lion', 'bear', 'wolf', 'fox',
  'rabbit', 'deer', 'giraffe', 'zebra', 'kangaroo', 'panda', 'monkey',
  'dolphin', 'shark', 'whale', 'eagle', 'owl',
];

const rand = (ds: string[]) => ds[Math.floor(Math.random() * ds.length)];

/**
 * @public  Generates a random slug.
 * @since   0.3.0
 * @version 0.3.0
 */
export const genSlug = () => `${rand(ADJECTIVES)}-${rand(SUBJECTS)}`;
