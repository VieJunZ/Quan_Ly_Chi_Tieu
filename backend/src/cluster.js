/**
 * @file cluster.js
 * @description Chạy máy chủ trên nhiều nhân CPU cùng lúc (mỗi nhân một tiến trình, chung một cổng).
 * Node.js chỉ dùng 1 nhân cho JavaScript, trong khi băm mật khẩu (bcrypt) khi đăng nhập/đăng ký
 * rất tốn CPU, nên khi đông người dùng tách ra nhiều tiến trình sẽ chịu tải tốt hơn hẳn.
 *
 * Chạy: npm run start:cluster
 * Số tiến trình: biến WEB_CONCURRENCY (mặc định = số nhân CPU, tối đa 8).
 * Lưu ý: bộ đếm chống spam (rateLimit.middleware.js) nằm riêng trong từng tiến trình.
 */

const cluster = require("cluster");
const os = require("os");

if (cluster.isPrimary) {
  const cpus = typeof os.availableParallelism === "function" ? os.availableParallelism() : os.cpus().length;
  const count = Math.max(1, Number(process.env.WEB_CONCURRENCY) || Math.min(cpus, 8));
  const workerIds = new Map();
  let stopping = false;

  const fork = (id) => {
    const worker = cluster.fork({ WORKER_ID: String(id) });
    workerIds.set(worker.id, id);
  };

  console.log(`Chạy ${count} tiến trình máy chủ...`);
  for (let i = 1; i <= count; i++) fork(i);

  // Tiến trình nào chết bất ngờ thì bật lại, giữ đúng số thứ tự để tiến trình số 1 vẫn lo việc dọn dẹp
  cluster.on("exit", (worker, code) => {
    const id = workerIds.get(worker.id);
    workerIds.delete(worker.id);
    if (stopping) return;
    console.error(`Tiến trình ${id} dừng (mã ${code}), đang bật lại...`);
    setTimeout(() => fork(id), 1000);
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      stopping = true;
      for (const worker of Object.values(cluster.workers)) worker.kill(signal);
      setTimeout(() => process.exit(0), 5000).unref();
    });
  }
} else {
  const { startServer, stopServer } = require("./server");
  startServer().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => stopServer().finally(() => process.exit(0)));
  }
}
