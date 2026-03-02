import { type BunFile, type S3File, $, S3Client } from 'bun';
import { dirname, join, resolve } from 'node:path';
import { cry, is, noop, rescue } from './utils';
import type { Config } from './config';

/**
 * @public Represents a file in the local file system.
 * @since  18.0.0
 */
class LocalFile {
  public readonly '~native': BunFile

  /**
   * @public The absolute path to the file.
   * @since  18.0.0
   */
  public readonly path: string;

  /**
   * @public The file URL (e.g. `file:///path/to/file`).
   * @since  18.0.0
   */
  public readonly url: string;

  constructor(path: string) {
    this['~native'] = Bun.file(path);
    this.path = path;
    this.url = `file://${path}`;
  }
}

/**
 * @public Represents a file in an S3 bucket.
 * @since  18.0.0
 */
class RemoteFile {
  public readonly '~native': S3File;

  /**
   * @public The absolute path to the file inside the S3 bucket. It
   *         includes the cluster slug prefix if a slug was given.
   * @since  18.0.0
   */
  public readonly path: string;

  /**
   * @public The file URL (e.g. `s3://bucket-name/path/to/file`).
   * @since  18.0.0
   */
  public readonly url: string;

  constructor(s3: S3Client, path: string) {
    const native = s3.file(path);

    this['~native'] = native;
    this.path = path;
    this.url = `s3://${native.bucket}${path}`;
  }
}

/**
 * @public Union type of LocalFile and RemoteFile.
 * @since  18.0.0
 */
export type AnyFile = LocalFile | RemoteFile;
export type { LocalFile, RemoteFile };

/**
 * @public Creates a file system abstraction that works the same
 *         across local fs and a remote fs (i.e S3 bucket).
 * @since  18.0.0
 */
export const createFs = async (config: Config) => {
  const LOCAL_STATE_DIR = config.PG_STATE_DIR;
  const LOCAL_TEMP_DIR = config.PG_TEMP_DIR;
  const LOCAL_DATA_DIR = config.PGDATA;

  const S3_ARCHIVES_PREFIX = config.S3_ARCHIVES_PREFIX;
  const S3_BACKUPS_PREFIX = config.S3_BACKUPS_PREFIX;
  const S3_STATE_PREFIX = config.S3_STATE_PREFIX;

  const s3 = new S3Client({
    endpoint: config.S3_ENDPOINT,
    region: config.S3_REGION,
    bucket: config.S3_BUCKET,
    accessKeyId: config.S3_ACCESS_KEY_ID,
    secretAccessKey: config.S3_SECRET_ACCESS_KEY,
  });

  // we gotta make sure pg's temp dir exists before we can run
  // commands that can potentially write to it.
  await $`mkdir -p ${config.PG_TEMP_DIR}`.text();

  /**
   * Filesystem abstraction for working with local and remote (S3)
   * files.
   */
  const fs = {
    local: {
      /**
       * @public Creates an instance of a file in the local file
       *         system.
       * @since  18.0.0
       */
      file: (path: string) => new LocalFile(path),
      data: {
        /**
         * @public Returns the absolute path after joining the given
         *         relative path with the data directory.
         * @since  18.0.0
         */
        join: (path: string) => resolve(join(LOCAL_DATA_DIR, path))
      },
      state: {
        /**
         * @public Returns the absolute path after joining the given
         *         relative path with the state directory.
         * @since  18.0.0
         */
        join: (path: string) => resolve(join(LOCAL_STATE_DIR, path)),
      },
      temp: {
        /**
         * @public Returns the absolute path after joining the given
         *         relative path with the temp directory.
         * @since  18.0.0
         */
        join: (path: string) => resolve(join(LOCAL_TEMP_DIR, path)),
      },
    },
    s3: {
      /**
       * @public Creates an instance of a file in S3.
       * @since  18.0.0
       */
      file: (path: string) => new RemoteFile(s3, path),
      archives: {
        /**
         * @public Returns the absolute path after joining the given
         *         relative path with the archives directory.
         * @since  18.0.0
         */
        join: (path: string) => resolve(join(S3_ARCHIVES_PREFIX, path)),
      },
      backups: {
        /**
         * @public Returns the absolute path after joining the given
         *         relative path with the backups directory.
         * @since  18.0.0
         */
        join: (path: string) => resolve(join(S3_BACKUPS_PREFIX, path)),
      },
      state: {
        /**
         * @public Returns the absolute path after joining the given
         *         relative path with the state directory.
         * @since  18.0.0
         */
        join: (path: string) => resolve(join(S3_STATE_PREFIX, path)),
      },
    },
    /**
     * @public Resolves to the contents of the file as a
     *         {@link Uint8Array} (array of bytes).
     * @since  18.0.0
     */
    bytes: async (file: AnyFile) => file['~native'].bytes(),
    /**
     * @public Copies the contents of a source file into a destination
     *         file.
     * @since  18.0.0
     */
    cp: async (source: AnyFile, destination: AnyFile) => Bun.write(destination['~native'], source['~native']),
    /**
     * @public Gets the directory name of the given file.
     * @since  18.0.0
     */
    dirname: (file: AnyFile) => dirname(file.path),
    /**
     * @public  Checks whether the file exists.
     * @since   18.0.0
     */
    exists: async (file: AnyFile) => file['~native'].exists(),
    /**
     * @public Deletes the given file.
     * @since  18.0.0
     */
    rm: async (file: AnyFile) => file['~native'].unlink().catch(rescue(is.errorWithCode('ENOENT'), noop)),
    /**
     * @public Computes the SHA-256 hash of the given file. Only for
     *         local files, would be too expensive for remote files.
     * @since  18.0.0
     */
    sha256: async (file: LocalFile) => cry.sha256(await fs.bytes(file)),
    /**
     * @public Resolves to the size of the file in bytes.
     * @since  18.0.0
     */
    size: async (file: AnyFile) => file['~native'].stat().then(stat => stat.size),
    /**
     * @public Resolves to the contents of the file as a string.
     * @since  18.0.0
     */
    text: async (file: AnyFile) => file['~native'].text(),
    /**
     * @public Writes the given content to the file.
     * @since  18.0.0
     */
    write: async (file: AnyFile, content: string) => Bun.write(file['~native'], content),
  };

  return fs;
};

/**
 * @public The shape of the file system object.
 * @since  18.0.0
 */
export type FileSystem = ReturnType<typeof createFs>;
