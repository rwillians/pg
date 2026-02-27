import { column } from '@rwillians/qx';
import { zc } from '../utils';
import { z } from 'zod/v4';

/**
 * @private Registry of custom column types.
 * @since   18.0.0
 */
export const tc = {
  /**
   * @private Stores an absolute path.
   * @since   18.0.0
   */
  absolutePath: () => column({ type: 'TEXT', schema: zc.absolutePath() }),
  /**
   * @private Stores storage size in bytes.
   * @since   18.0.0
   */
  bytesize: () => column({ type: 'INTEGER', schema: z.int().positive() })
};
