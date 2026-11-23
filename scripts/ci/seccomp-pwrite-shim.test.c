/* Behaviour check for seccomp-pwrite-shim.so; CI runs it with LD_PRELOAD
 * before preloading the shim for the whole job. Exit 0 means every case
 * matched pwrite(2) semantics and the calls really went through the shim.
 */

#define _GNU_SOURCE
#include <dlfcn.h>
#include <errno.h>
#include <fcntl.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/resource.h>
#include <sys/uio.h>
#include <unistd.h>

static int failures = 0;

#define CHECK(cond, what)                                                     \
  do {                                                                        \
    if (!(cond)) {                                                            \
      fprintf(stderr, "FAIL %s (errno=%d)\n", what, errno);                   \
      failures++;                                                             \
    }                                                                         \
  } while (0)

static int fresh(const char *path) {
  int fd = open(path, O_RDWR | O_CREAT | O_TRUNC, 0600);
  if (fd < 0 || write(fd, "0123456789", 10) != 10) {
    perror(path);
    exit(2);
  }
  return fd;
}

static int content_is(int fd, const char *want) {
  char buf[64] = {0};
  ssize_t n = pread(fd, buf, sizeof buf - 1, 0);
  return n == (ssize_t)strlen(want) && memcmp(buf, want, (size_t)n) == 0;
}

int main(void) {
  const char *path = "/tmp/pwrite-shim-test.bin";

  const char *symbols[] = {"pwrite", "pwritev", "pwritev2", "pwritev64v2"};
  for (size_t i = 0; i < sizeof symbols / sizeof *symbols; i++) {
    Dl_info info;
    void *sym = dlsym(RTLD_DEFAULT, symbols[i]);
    if (!sym || !dladdr(sym, &info) || !info.dli_fname ||
        !strstr(info.dli_fname, "pwrite-shim")) {
      fprintf(stderr, "FAIL %s resolves to the preloaded shim\n", symbols[i]);
      failures++;
    }
  }

  int fd = fresh(path);
  lseek(fd, 3, SEEK_SET);
  CHECK(pwrite(fd, "ab", 2, 6) == 2, "pwrite returns the byte count");
  CHECK(lseek(fd, 0, SEEK_CUR) == 3, "pwrite keeps the file offset");
  CHECK(content_is(fd, "012345ab89"), "pwrite writes at the given offset");

  struct iovec iov[2] = {{"X", 1}, {"YZ", 2}};
  CHECK(pwritev(fd, iov, 2, 0) == 3, "pwritev returns the byte count");
  CHECK(lseek(fd, 0, SEEK_CUR) == 3, "pwritev keeps the file offset");
  CHECK(content_is(fd, "XYZ345ab89"), "pwritev writes at the given offset");

  CHECK(pwritev2(fd, iov, 2, -1, 0) == 3, "pwritev2(-1) returns the count");
  CHECK(lseek(fd, 0, SEEK_CUR) == 6, "pwritev2(-1) advances the offset");
  CHECK(content_is(fd, "XYZXYZab89"), "pwritev2(-1) writes at the offset");

  errno = 0;
  CHECK(pwritev2(fd, iov, 2, 0, 1) == -1 && errno == ENOTSUP,
        "pwritev2 rejects RWF flags with ENOTSUP");

  int pipefd[2];
  CHECK(pipe(pipefd) == 0, "pipe");
  errno = 0;
  CHECK(pwrite(pipefd[1], "a", 1, 0) == -1 && errno == ESPIPE,
        "pwrite on a pipe keeps ESPIPE");
  errno = 0;
  CHECK(pwrite(-1, "a", 1, 0) == -1 && errno == EBADF,
        "pwrite on a bad fd keeps EBADF");

  /* Partial write: the file size limit cuts the write short. */
  signal(SIGXFSZ, SIG_IGN);
  struct rlimit lim = {12, 12};
  CHECK(setrlimit(RLIMIT_FSIZE, &lim) == 0, "setrlimit");
  lseek(fd, 1, SEEK_SET);
  CHECK(pwrite(fd, "abcdef", 6, 8) == 4, "pwrite reports a partial write");
  CHECK(lseek(fd, 0, SEEK_CUR) == 1, "partial pwrite keeps the offset");
  errno = 0;
  CHECK(pwrite(fd, "a", 1, 12) == -1 && errno == EFBIG,
        "pwrite past the limit keeps EFBIG");
  CHECK(lseek(fd, 0, SEEK_CUR) == 1, "failed pwrite keeps the offset");

  close(fd);
  unlink(path);
  if (failures == 0)
    puts("seccomp-pwrite-shim: all checks passed");
  return failures == 0 ? 0 : 1;
}
