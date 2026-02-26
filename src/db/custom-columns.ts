import { column } from '@rwillians/qx';
import { zc } from '../utils';
import { z } from 'zod/v4';

/**
 * @private Custom column types for qx (the ORM).
 * @since   18.0.0
 */
export const tc = {
  /**
   * @private A validated column type that expected an absolute path.
   * @since   18.0.0
   * @version 1
   */
  absolutePath: () => column({ type: 'TEXT', schema: zc.absolutePath() }),
  /**
   * @private A validated column that expects a memory / storage size
   *          in bytes.
   * @since   18.0.0
   * @version 1
   */
  bytesize: () => column({ type: 'INTEGER', schema: z.int().min(1) })
};
