import type { BunFile as BunLocalFile, S3Client, S3File as BunS3File } from 'bun';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { CryptoHasher, write } from 'bun';
import { ReadOnlyError } from './errors';
import { type Config } from './config';
import { _, p, raise } from './utils';

/**
 * @private Resolves the absolute path of a namespace path in S3,
 *          prefixing it for cluster isolation when a slug is
 *          provided.
 * @since   18.0.0
 * @version 1
 */
const namespace = (namespace: string, { slug }: { slug?: string } = {}) =>
    isAbsolute(namespace) === false ? raise(new Error('namespace must be an absolute path'))
  : slug                            ? join(`/clusters/${slug}`, namespace)
  : namespace;

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
  /**
   * @ignore
   * @private  Bun's native local file instance, hidden away to make
   *           it easier to enforce read-only access.
   */
  public readonly '~native': BunLocalFile;

  /**
   * @public  The name of the file, derived from its path.
   * @since   18.0.0
   * @version 1
   */
  public readonly name: string;

  /**
   * @public  The absolute path to the file in the local filesystem.
   * @since   18.0.0
   * @version 1
   */
  public readonly path: string;

  /**
   * @public  The absolute path to the file in the local filesystem
   *          as a URL.
   * @since   18.0.0
   * @version 1
   */
  public readonly url: string;

  /**
   * @param {string} path The absolute path to the file in the local
   *                      filesystem.
   */
  constructor(path: string) {
    this['~native'] = Bun.file(path);
    this.name = basename(path);
    this.path = path;
    this.url = `file:/${path}`;
  }
}

/**
 * @private  Wraps Bun.S3File to limite the exposed surface area, what
 *           helps enforcing read-only access.
 * @since    18.0.0
 * @version  1
 */
class S3File {
  /**
   * @ignore
   * @private  Bun's native S3 file instance, hidden away to make it
   *           easier to enforce read-only access.
   */
  public readonly '~native': BunS3File;

  /**
   * @public  The name of the S3 bucket where the file is located.
   * @since   18.0.0
   * @version 1
   */
  public readonly bucket: string;

  /**
   * @public  The name of the file, derived from its path.
   * @since   18.0.0
   * @version 1
   */
  public readonly name: string;

  /**
   * @public  The absolute path to the file in the local filesystem.
   * @since   18.0.0
   * @version 1
   */
  public readonly path: string;

  /**
   * @public  The absolute path to the file in S3 as a URL.
   * @since   18.0.0
   * @version 1
   */
  public readonly url: string;

  /**
   * @param {S3Client} s3   Bun's S3 client instance.
   * @param {string}   path The absolute path to the file in S3.
   */
  constructor(s3: S3Client, path: string) {
    this['~native'] = s3.file(path);
    this.bucket = this['~native'].bucket!;
    this.name = basename(path);
    this.path = path;
    this.url = `s3://${this.bucket}${this.path}`;
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
 *
 *          The file types available to user-land only exposes a
 *          subset of Bun's file API. That so we can centralize all
 *          reads and writes operations to the fs instance returned by
 *          this function, which makes it easier to enforce read-only
 *          access to files when pg is in read-only mode.
 * @since   18.0.0
 * @version 1
 */
export const createFs = (config: Config, s3: S3Client) => {
  const S3_ARCHIVES_NAMESPACE = namespace(config.S3_ARCHIVES_PREFIX, { slug: config.PG_CLUSTER_SLUG });
  const S3_BACKUPS_NAMESPACE = namespace(config.S3_BACKUPS_PREFIX, { slug: config.PG_CLUSTER_SLUG });
  const PG_READONLY_MODE = config.PG_READONLY_MODE;
  const PG_STATE_DIR = config.PG_STATE_DIR;
  const PG_TEMP_DIR = config.PG_TEMP_DIR;
  const PG_DATA_DIR = config.PGDATA;
  const CWD = process.cwd();

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
      file: (path: string) => new LocalFile(resolve(CWD, path)),
      state: {
        /**
         * @public  Instantiates a file from under the local state
         *          directory.
         * @since   18.0.0
         * @version 1
         */
        file: (path: string) => new LocalFile(resolve(join(PG_STATE_DIR, path))),
      },
      data: {
        /**
         * @public  Instantiates a file from under the local Postgre's
         *          data directory.
         * @since   18.0.0
         * @version 1
         */
        file: (path: string) => new LocalFile(resolve(join(PG_DATA_DIR, path)))
      },
      temp: {
        /**
         * @public  Instantiates a file from under the local temporary
         *          directory.
         * @since   18.0.0
         * @version 1
         */
        file: (path: string) => new LocalFile(resolve(join(PG_TEMP_DIR, path))),
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
        file: (name: string) => new S3File(s3, resolve(join(S3_ARCHIVES_NAMESPACE, name))),
      },
      backups: {
        /**
         * @public  Instantiates a file from under the s3 backups
         *          directory.
         * @since   18.0.0
         * @version 1
         */
        file: (name: string) => new S3File(s3, resolve(join(S3_BACKUPS_NAMESPACE, name))),
      },
    },
    /**
     * @public  Returns a promise that resolves to the contents of the
     *          file as a {@link Uint8Array} (array of bytes).
     * @since   18.0.0
     * @version 1
     */
    bytes: async (file: AnyFile) => file['~native'].bytes(),
    /**
     * @public  Copies the contents of a source file into a
     *          destination file, doesn't matter if either or both are
     *          local or in S3.
     * @since   18.0.0
     * @version 1
     */
    cp: async (source: AnyFile, destination: AnyFile) => PG_READONLY_MODE && destination instanceof S3File
      ? p.reject(new ReadOnlyError('write file to s3'))
      : write(destination['~native'], source['~native']),
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
    exists: async (file: AnyFile) => file['~native'].exists(),
    /**
     * @public  Deletes a file, whether local or in S3.
     * @since   18.0.0
     * @version 1
     */
    rm: async (file: AnyFile) => PG_READONLY_MODE && file instanceof S3File
      ? p.reject(new ReadOnlyError('delete file from s3'))
      : file['~native'].unlink(),
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
    size: async (file: AnyFile) => file['~native'].stat().then(stat => stat.size),
  };

  return fs;
};
