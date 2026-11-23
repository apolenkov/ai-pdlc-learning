/* LD_PRELOAD shim for the shared GitLab runner host (uds-git).
 *
 * That host runs an ancient dockerd whose default seccomp profile returns
 * EPERM for the pwrite64/pwritev syscall family while write()/writev(),
 * pread64(), fsync(), fcntl() locks and mmap() are all allowed. SQLite
 * commits use pwrite64(), so every file-backed write failed there with
 * SQLITE_IOERR_WRITE (errcode 778, "disk I/O error") on any filesystem,
 * and libuv positioned writes fail the same way.
 *
 * The shim emulates pwrite*() via lseek()+write*(), preserving the file
 * offset like the real calls do. A process-wide mutex serializes the
 * lseek/write pairs so callers sharing an fd across threads (e.g. libuv
 * worker pool) keep correct semantics; cross-process fd sharing still
 * races on the position, which stock pwrite() would not — SQLite callers
 * serialize access through POSIX locks, so the emulation preserves the
 * semantics exercised by the test suite.
 *
 * Limitation: the mutex only covers shim calls. A plain read/write/lseek
 * on the same open file description from another thread can land between
 * the seek, the write and the restore and see or move the shifted offset.
 * Real pwrite() is atomic here; the shim is not. Acceptable for npm/SQLite
 * in CI, not a general replacement.
 *
 * pwritev2()/pwritev64v2() emulate only flags==0; nonzero RWF_* flags get
 * ENOTSUP rather than silently wrong semantics. offset -1 means "current
 * file offset" (like writev), so it writes there and advances the offset. Every interposed symbol
 * follows its PUBLIC prototype: LD_PRELOAD matches calls by the caller's
 * ABI, so pwritev64v2 takes a single 64-bit offset — a split off_l/off_h
 * pair would land `flags` where the caller passes the offset.
 *
 * Set PWSHIM_DEBUG=1 to print a one-line activation marker on stderr.
 * Loaded in CI only, on that runner; seccomp-pwrite-shim.test.c checks it.
 */

#define _GNU_SOURCE
#define _LARGEFILE64_SOURCE /* musl: off64_t/pwrite64 need it explicitly */
#include <errno.h>
#include <pthread.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/uio.h>
#include <unistd.h>

/* musl headers macro-alias the LFS64 names to the base ones (off_t is
 * already 64-bit), which would turn the definitions below into
 * redefinitions. Undo the aliases; the exported dynamic symbols keep the
 * real names callers may reference. */
#undef pwrite64
#undef pwritev64
#undef pwritev64v2

static pthread_mutex_t shim_lock = PTHREAD_MUTEX_INITIALIZER;

static void debug_once(void) {
  static int done = 0;
  if (!done && getenv("PWSHIM_DEBUG")) {
    done = 1;
    fputs("seccomp-pwrite-shim: active\n", stderr);
  }
}

/* pwrite(): write at offset without keeping the new position. */
static ssize_t emulate(int fd, const void *buf, size_t n, off_t off,
                       int vec) {
  debug_once();
  pthread_mutex_lock(&shim_lock);
  off_t cur = lseek(fd, 0, SEEK_CUR);
  if (cur == (off_t)-1) {
    int e = errno;
    pthread_mutex_unlock(&shim_lock);
    errno = e;
    return -1; /* ESPIPE etc.: pwrite would fail too */
  }
  if (lseek(fd, off, SEEK_SET) == (off_t)-1) {
    int e = errno;
    lseek(fd, cur, SEEK_SET);
    pthread_mutex_unlock(&shim_lock);
    errno = e;
    return -1;
  }
  ssize_t r = vec ? writev(fd, (const struct iovec *)buf, (int)n)
                  : write(fd, buf, n);
  int e = errno;
  if (lseek(fd, cur, SEEK_SET) == (off_t)-1 && r >= 0) {
    /* The offset restore failed after a successful write: the shim cannot
     * claim success, and the restore's errno is the one worth reporting. */
    r = -1;
    e = errno;
  }
  pthread_mutex_unlock(&shim_lock);
  errno = e;
  return r;
}

ssize_t pwrite(int fd, const void *buf, size_t n, off_t off) {
  return emulate(fd, buf, n, off, 0);
}

ssize_t pwrite64(int fd, const void *buf, size_t n, off64_t off) {
  return emulate(fd, buf, n, (off_t)off, 0);
}

ssize_t pwritev(int fd, const struct iovec *iov, int cnt, off_t off) {
  return emulate(fd, iov, (size_t)cnt, off, 1);
}

ssize_t pwritev64(int fd, const struct iovec *iov, int cnt, off64_t off) {
  return emulate(fd, iov, (size_t)cnt, (off_t)off, 1);
}

static ssize_t v2(int fd, const struct iovec *iov, int cnt, off_t off,
                  int flags) {
  if (flags != 0) {
    errno = ENOTSUP; /* RWF_* cannot be honored through lseek+writev */
    return -1;
  }
  if (off == -1)
    return writev(fd, iov, cnt);
  return emulate(fd, iov, (size_t)cnt, off, 1);
}

ssize_t pwritev2(int fd, const struct iovec *iov, int cnt, off_t off,
                 int flags) {
  return v2(fd, iov, cnt, off, flags);
}

ssize_t pwritev64v2(int fd, const struct iovec *iov, int cnt, off64_t off,
                    int flags) {
  return v2(fd, iov, cnt, (off_t)off, flags);
}
