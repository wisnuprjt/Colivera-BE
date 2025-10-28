const pool = require("./db");

// Ambil semua notifikasi (bisa difilter)
async function getNotifications({ type, status, active, limit = 20, offset = 0 } = {}) {
  let sql = `
    SELECT id, sensor_id, message, type, severity, active, status, meta,
           cfu_value, threshold, created_at, read_at, resolved_at
    FROM notifications
    WHERE 1=1
  `;
  const params = [];

  if (type) {
    sql += ` AND type = ?`;
    params.push(type);
  }
  if (status) {
    sql += ` AND status = ?`;
    params.push(status);
  }
  if (active !== undefined) {
    sql += ` AND active = ?`;
    params.push(Number(active) ? 1 : 0);
  }

  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));

  const [rows] = await pool.query(sql, params);
  return rows;
}

// Buat notifikasi baru
async function createNotification(payload) {
  const {
    sensor_id,
    message,
    type = "threshold",
    severity = "info",
    active = 1,
    status = "unread",
    cfu_value = null,
    threshold = null,
    meta = null,
  } = payload;

  const [result] = await pool.query(
    `INSERT INTO notifications 
     (sensor_id, message, type, severity, active, status, cfu_value, threshold, meta)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [sensor_id, message, type, severity, active, status, cfu_value, threshold, meta]
  );

  const [rows] = await pool.query(
    `SELECT * FROM notifications WHERE id = ?`,
    [result.insertId]
  );
  return rows[0];
}

async function getUnreadCount() {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count FROM notifications WHERE status='unread'`
  );
  return rows[0].count || 0;
}

async function markAsRead(id) {
  await pool.query(
    `UPDATE notifications SET status='read', read_at = NOW() WHERE id = ?`,
    [id]
  );
  const [rows] = await pool.query(`SELECT * FROM notifications WHERE id = ?`, [id]);
  return rows[0];
}

async function markAsResolved(id) {
  await pool.query(
    `UPDATE notifications SET status='resolved', active=0, resolved_at = NOW() WHERE id = ?`,
    [id]
  );
  const [rows] = await pool.query(`SELECT * FROM notifications WHERE id = ?`, [id]);
  return rows[0];
}

async function removeNotification(id) {
  const [result] = await pool.query(`DELETE FROM notifications WHERE id = ?`, [id]);
  return result.affectedRows > 0;
}

module.exports = {
  getNotifications,
  getUnreadCount,
  createNotification,
  markAsRead,
  markAsResolved,
  removeNotification,
};
