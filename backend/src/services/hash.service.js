/**
 * @file hash.service.js
 * @description Băm và so mật khẩu (bcrypt) trên các luồng phụ thay vì luồng chính của Node.js.
 * bcryptjs viết bằng JavaScript, mỗi lần băm mất khoảng 50-100 ms CPU; chạy trên luồng chính thì
 * trong lúc một người đăng nhập, mọi người khác (kể cả chỉ mở trang chủ) đều phải đứng chờ.
 * Dùng giống bcryptjs: hash(chuỗi, số vòng), compare(chuỗi, mã băm).
 *
 * Số luồng: biến HASH_THREADS. Mặc định 1 luồng khi chạy cluster.js (đã có nhiều tiến trình),
 * còn chạy một tiến trình thì dùng tối đa 4 luồng.
 */

const os = require("os");
const path = require("path");
const { Worker, isMainThread, parentPort } = require("worker_threads");
const bcrypt = require("bcryptjs");

if (!isMainThread) {
  // Mã chạy trong luồng phụ: nhận việc, trả kết quả theo id
  parentPort.on("message", async ({ id, op, text, arg }) => {
    try {
      const result = op === "hash" ? await bcrypt.hash(text, arg) : await bcrypt.compare(text, arg);
      parentPort.postMessage({ id, result });
    } catch (error) {
      parentPort.postMessage({ id, error: error.message });
    }
  });
} else {
  const cpus = typeof os.availableParallelism === "function" ? os.availableParallelism() : os.cpus().length;
  const SIZE = Math.max(1, Number(process.env.HASH_THREADS) || (process.env.WORKER_ID ? 1 : Math.min(4, cpus - 1)));

  const workers = [];
  const jobs = new Map();
  let nextId = 0;
  let turn = 0;

  function spawn() {
    const worker = new Worker(path.join(__dirname, "hash.service.js"));
    worker.pending = 0;
    worker.unref();
    worker.on("message", ({ id, result, error }) => {
      const job = jobs.get(id);
      if (!job) return;
      jobs.delete(id);
      worker.pending--;
      if (error) job.reject(new Error(error));
      else job.resolve(result);
    });
    // Luồng phụ chết bất ngờ: báo lỗi cho các việc đang chờ và thay luồng mới
    worker.on("error", (error) => {
      for (const [id, job] of jobs) {
        if (job.worker === worker) {
          jobs.delete(id);
          job.reject(error);
        }
      }
      workers.splice(workers.indexOf(worker), 1);
    });
    workers.push(worker);
    return worker;
  }

  function pick() {
    if (workers.length < SIZE) return spawn();
    // Chọn luồng đang ít việc nhất
    let best = workers[turn++ % workers.length];
    for (const w of workers) if (w.pending < best.pending) best = w;
    return best;
  }

  function run(op, text, arg) {
    return new Promise((resolve, reject) => {
      const worker = pick();
      const id = ++nextId;
      worker.pending++;
      jobs.set(id, { resolve, reject, worker });
      worker.postMessage({ id, op, text: String(text), arg });
    });
  }

  module.exports = {
    hash: (text, rounds) => run("hash", text, rounds),
    compare: (text, hash) => run("compare", text, hash),
    async shutdown() {
      await Promise.all(workers.splice(0).map((w) => w.terminate()));
    }
  };
}
