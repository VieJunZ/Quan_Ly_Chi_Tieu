/**
 * @file db.js
 * @description Kết nối SQL Server (LocalDB hoặc instance khác) qua driver ODBC msnodesqlv8.
 * Mọi truy vấn đều truyền tham số (không ghép chuỗi) để chống SQL Injection.
 */

const isWindowsLocalDb = !process.env.DB_USER && !process.env.DB_CONNECTION_STRING && process.platform === "win32";
const sql = isWindowsLocalDb ? require("mssql/msnodesqlv8") : require("mssql");
require("dotenv").config();

const DEFAULT_SERVER = String.raw`(localdb)\MSSQLLocalDB`;

function buildConnectionString() {
  if (process.env.DB_CONNECTION_STRING) return process.env.DB_CONNECTION_STRING;

  const driver = process.env.DB_DRIVER || "ODBC Driver 17 for SQL Server";
  const server = process.env.DB_SERVER || DEFAULT_SERVER;
  const database = process.env.DB_NAME || "so_chi_tri_db";
  const auth = process.env.DB_USER
    ? `Uid=${process.env.DB_USER};Pwd=${process.env.DB_PASS || ""};`
    : "Trusted_Connection=yes;";

  return `Driver={${driver}};Server=${server};Database=${database};${auth}TrustServerCertificate=yes;`;
}

function getPoolConfig() {
  if (isWindowsLocalDb) {
    return {
      connectionString: buildConnectionString(),
      pool: {
        max: Number(process.env.DB_POOL_MAX) || 20,
        min: Number(process.env.DB_POOL_MIN) || 2,
        idleTimeoutMillis: 5 * 60 * 1000
      }
    };
  }
  if (process.env.DB_CONNECTION_STRING) {
    return process.env.DB_CONNECTION_STRING;
  }
  return {
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME || "so_chi_tri_db",
    port: Number(process.env.DB_PORT) || 1433,
    options: {
      encrypt: process.env.DB_ENCRYPT === "false" ? false : true,
      trustServerCertificate: true
    },
    pool: {
      max: Number(process.env.DB_POOL_MAX) || 20,
      min: Number(process.env.DB_POOL_MIN) || 2,
      idleTimeoutMillis: 5 * 60 * 1000
    }
  };
}

let poolPromise = null;

/** Lấy pool kết nối dùng chung (tạo ở lần gọi đầu tiên). */
function getPool() {
  if (!poolPromise) {
    const pool = new sql.ConnectionPool(getPoolConfig());
    poolPromise = pool.connect().catch((error) => {
      poolPromise = null;
      throw error;
    });
  }
  return poolPromise;
}

/**
 * Đoán kiểu SQL cho giá trị JS. Số nguyên vượt INT thì dùng BIGINT,
 * số lẻ dùng DECIMAL(15,2) giống cột amount.
 */
function inferType(value) {
  if (typeof value === "number") {
    if (!Number.isInteger(value)) return sql.Decimal(15, 2);
    return Math.abs(value) <= 2147483647 ? sql.Int : sql.BigInt;
  }
  if (typeof value === "boolean") return sql.Bit;
  return sql.NVarChar(sql.MAX);
}

/**
 * Gắn tham số vào request. Giá trị undefined bị bỏ qua để thủ tục dùng giá trị mặc định.
 * Có thể truyền { type, value } khi cần chỉ rõ kiểu.
 */
function bindInputs(request, inputs = {}) {
  for (const [name, raw] of Object.entries(inputs)) {
    if (raw === undefined) continue;
    if (raw && typeof raw === "object" && "type" in raw && "value" in raw) {
      request.input(name, raw.type, raw.value);
    } else {
      request.input(name, raw === null ? sql.NVarChar(sql.MAX) : inferType(raw), raw);
    }
  }
  return request;
}

const NUMERIC_TYPES = new Set(["int", "bigint", "smallint", "tinyint", "decimal", "numeric", "money"]);

/**
 * Driver ODBC trả cột IDENTITY và BIGINT dưới dạng chuỗi ("10").
 * Đổi lại thành số để frontend so sánh, cộng trừ không bị sai.
 */
function normalizeRecordset(recordset) {
  if (!recordset || !recordset.columns) return recordset || [];
  const numericColumns = Object.entries(recordset.columns)
    .filter(([, column]) => !column.type || NUMERIC_TYPES.has(column.type.declaration))
    .map(([name]) => name);
  if (numericColumns.length === 0) return recordset;
  for (const row of recordset) {
    for (const name of numericColumns) {
      const value = row[name];
      if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value)) row[name] = Number(value);
    }
  }
  return recordset;
}

/** Tạo request trên pool hoặc trên một transaction đang mở. */
async function newRequest(scope) {
  if (scope) return new sql.Request(scope);
  return (await getPool()).request();
}

/** Gọi stored procedure, trả về danh sách các bảng kết quả. */
async function exec(procName, inputs, scope) {
  const request = bindInputs(await newRequest(scope), inputs);
  const result = await request.execute(procName);
  return (result.recordsets || []).map(normalizeRecordset);
}

/** Gọi stored procedure và lấy bảng kết quả đầu tiên. */
async function execRows(procName, inputs, scope) {
  const sets = await exec(procName, inputs, scope);
  return sets[0] || [];
}

/** Chạy câu lệnh SQL có tham số (@ten), trả về bảng kết quả đầu tiên. */
async function query(text, inputs, scope) {
  const request = bindInputs(await newRequest(scope), inputs);
  const result = await request.query(text);
  return normalizeRecordset(result.recordset);
}

/**
 * Chạy nhiều câu lệnh trong một lần gửi, trả về danh sách bảng kết quả theo đúng thứ tự.
 * Dùng cho trang cần nhiều số liệu: 1 lượt đi về CSDL thay vì 5 lượt, đỡ tải khi đông người.
 */
async function queryMulti(text, inputs, scope) {
  const request = bindInputs(await newRequest(scope), inputs);
  const result = await request.query(text);
  return (result.recordsets || []).map(normalizeRecordset);
}

/** Chạy một nhóm thao tác trong cùng một transaction, lỗi thì rollback toàn bộ. */
async function withTransaction(work) {
  const transaction = new sql.Transaction(await getPool());
  await transaction.begin();
  try {
    const value = await work(transaction);
    await transaction.commit();
    return value;
  } catch (error) {
    try { await transaction.rollback(); } catch { /* transaction đã bị SQL Server hủy */ }
    throw error;
  }
}

/** Kiểm tra kết nối CSDL cho API /health. */
async function testDbConnection() {
  try {
    const rows = await query("SELECT DB_NAME() AS database_name, CONVERT(VARCHAR(19), SYSDATETIME(), 120) AS server_time");
    return { connected: true, ...rows[0] };
  } catch (error) {
    return { connected: false, error: error.message };
  }
}

/**
 * Chờ CSDL sẵn sàng lúc khởi động: thử lại mỗi 3 giây trong tối đa waitMs
 * (LocalDB vừa bật có thể chưa nhận kết nối ngay).
 */
async function waitForDb(waitMs = 60000) {
  const deadline = Date.now() + waitMs;
  let status = await testDbConnection();
  while (!status.connected && Date.now() < deadline) {
    console.log("Đang chờ SQL Server sẵn sàng...");
    await new Promise((resolve) => setTimeout(resolve, 3000));
    status = await testDbConnection();
  }
  return status;
}

async function closePool() {
  if (!poolPromise) return;
  const pool = await poolPromise.catch(() => null);
  poolPromise = null;
  if (pool) await pool.close();
}

module.exports = {
  sql,
  getPool,
  exec,
  execRows,
  query,
  queryMulti,
  withTransaction,
  testDbConnection,
  waitForDb,
  closePool
};
