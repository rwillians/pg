import type { BunFile, S3Client, S3File as BunS3File } from 'bun';
import { dirname, join, resolve } from 'node:path';
import { CryptoHasher, write } from 'bun';

import { ReadOnlyError } from './errors';
import { type Config } from './config';
import { _, p } from './utils';

/**
 * @private Resolves the path prefix in S3 for the given database slug
 *          and purpose-specific directory path.
 * @since   18.0.0
 * @version 1
 */
const prefix = (path: string, { slug }: { slug?: string } = {}) => slug
  ? join(`/clusters/${slug}`, path)
  : path;

/**
 * @private Calculates the SHA-256 hash of the given data.
 * @since   18.0.0
 * @version 1
 */
const sha256 = async (data: Uint8Array<ArrayBuffer>) => new CryptoHasher('sha256')
  .update(data)
  .digest('hex');

/**
 * @private  Wraps BunFile to limite the exposed surface area, what
 *           helps enforcing read-only access.
 * @since    18.0.0
 * @version  1
 */
class LocalFile {
  public readonly $native: BunFile;

  /**
   * @public  The absolute path to the file in the local filesystem.
   * @since   18.0.0
   * @version 1
   */
  public readonly path: string;

  /**
   * @public  The name of the file, derived from its path.
   * @since   18.0.0
   * @version 1
   */
  public readonly name: string;

  constructor(path: string, relativeTo: string = process.cwd()) {
    this.$native = Bun.file(path);
    this.path = path.startsWith('/') ? path : resolve(join(relativeTo, path));
    this.name = this.path.split('/').slice(-1)[0]!;
  }
}

/**
 * @private  Wraps Bun.S3File to limite the exposed surface area, what
 *           helps enforcing read-only access.
 * @since    18.0.0
 * @version  1
 */
class S3File {
  public readonly $native: BunS3File;

  /**
   * @public  The name of the S3 bucket where the file is located.
   * @since   18.0.0
   * @version 1
   */
  public readonly bucket: string;

  /**
   * @public  The absolute path to the file in the local filesystem.
   * @since   18.0.0
   * @version 1
   */
  public readonly path: string;

  /**
   * @public  The name of the file, derived from its path.
   * @since   18.0.0
   * @version 1
   */
  public readonly name: string;

  constructor(s3: S3Client, path: string) {
    this.$native = s3.file(path);
    this.bucket = this.$native.bucket!;
    this.path = `s3://${this.bucket}/` + _.trimLeading(path, '/');
    this.name = path.split('/').slice(-1)[0]!;
  }
}

/**
 * @public  A union type representing any file that can be worked with
 *          by the filesystem abstraction, whether local or in S3.
 * @since   18.0.0
 * @version 1
 */
export type AnyFile = LocalFile | S3File;

/**
 * @public  Creates an abstraction over the filesystem, providing
 *          functions for working with both the local filesystem and
 *          S3.
 * @since   18.0.0
 * @version 1
 */
export const createFs = (config: Config, s3: S3Client) => {
  const S3_ARCHIVES_PREFIX = prefix(config.S3_ARCHIVES_PREFIX, { slug: config.PG_CLUSTER_SLUG});
  const S3_BACKUPS_PREFIX = prefix(config.S3_BACKUPS_PREFIX, { slug: config.PG_CLUSTER_SLUG});
  const PG_READONLY_MODE = config.PG_READONLY_MODE;
  const PG_STATE_DIR = config.PG_STATE_DIR;
  const PG_TEMP_DIR = config.PG_TEMP_DIR;
  const PGDATA = config.PGDATA;

  /**
   * @public  Functions for working with the filesystem, both local
   *          and S3.
   * @since   18.0.0
   */
  const fs = {
    local: {
      /**
       * @public  Instantiates a file from anywhere in the local
       *          filesystem.
       * @since   18.0.0
       * @version 1
       */
      file: (path: string) => new LocalFile(path),
      state: {
        /**
         * @public  Instantiates a file from under the local state
         *          directory.
         * @since   18.0.0
         * @version 1
         */
        file: (path: string) => new LocalFile(path, PG_STATE_DIR),
      },
      data: {
        /**
         * @public  Instantiates a file from under the local Postgre's
         *          data directory.
         * @since   18.0.0
         * @version 1
         */
        file: (path: string) => new LocalFile(path, PGDATA)
      },
      temp: {
        /**
         * @public  Instantiates a file from under the local temporary
         *          directory.
         * @since   18.0.0
         * @version 1
         */
        file: (path: string) => new LocalFile(path, PG_TEMP_DIR),
      },
    },
    s3: {
      archives: {
        /**
         * @public  Instantiates a file from under the s3 archives
         *          directory.
         * @since   18.0.0
         * @version 1
         */
        file: (name: string) => new S3File(s3, join(S3_ARCHIVES_PREFIX, name)),
      },
      backups: {
        /**
         * @public  Instantiates a file from under the s3 backups
         *          directory.
         * @since   18.0.0
         * @version 1
         */
        file: (name: string) => new S3File(s3, join(S3_BACKUPS_PREFIX, name)),
      },
    },
    /**
     * @public  Returns a promise that resolves to the contents of the
     *          file as a {@link Uint8Array} (array of bytes).
     * @since   18.0.0
     * @version 1
     */
    bytes: async (file: AnyFile) => file.$native.bytes(),
    /**
     * @public  Copies the contents of a source file into a
     *          destination file, doesn't matter if either or both are
     *          local or in S3.
     * @since   18.0.0
     * @version 1
     */
    cp: async (source: AnyFile, destination: AnyFile) => PG_READONLY_MODE && destination instanceof S3File
      ? p.reject(new ReadOnlyError('write file to s3'))
      : write(destination.$native, source.$native),
    /**
     * @public  Gets the directory name of a given path or file,
     *          whether local or in S3.
     * @since   18.0.0
     * @version 1
     */
    dirname: (file: string | AnyFile) => dirname(typeof file === 'string' ? file : file.path),
    /**
     * @public  Checks if a file exists, whether local or in S3.
     * @since   18.0.0
     * @version 1
     */
    exists: async (file: AnyFile) => file.$native.exists(),
    /**
     * @public  Deletes a file, whether local or in S3.
     * @since   18.0.0
     * @version 1
     */
    rm: async (file: AnyFile) => PG_READONLY_MODE && file instanceof S3File
      ? p.reject(new ReadOnlyError('delete file from s3'))
      : file.$native.unlink(),
    /**
     * @public  Calculate the SHA-256 hash of a local file.
     *
     *          **NOTE:** limited to local files because it can be
     *          really expensive to download a file from S3 just to
     *          hash it.
     * @since   18.0.0
     * @version 1
     */
    sha256: async (file: LocalFile) => await fs.exists(file)
      ? sha256(await fs.bytes(file))
      : null,
    /**
     * @public  Gets the size of a file in bytes, whether local or in
     *          S3.
     * @since   18.0.0
     * @version 1
     */
    size: async (file: AnyFile) => file.$native.stat().then(stat => stat.size),
  };

  return fs;
};
