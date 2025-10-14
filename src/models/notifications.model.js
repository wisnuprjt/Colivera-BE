const pool = require('./db'); // pastikan db.js export pool mysql2/promise

async function getNotifications({ status, limit = 20, offset = 0 } = {}) {
  let sql = `SELECT id, sensor_id, message, severity, status, cfu_value, threshold, created_at, read_at, resolved_at
             FROM notifications`;
  const params = [];

  if (status) {
    sql += ` WHERE status = ?`;
    params.push(status);
  }

  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));

  const [rows] = await pool.query(sql, params);
  return rows;
}

async function getUnreadCount() {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count FROM notifications WHERE status='unread'`
  );
  return rows[0].count || 0;
}

async function createNotification(payload) {
  const {
    sensor_id,
    message,
    severity = 'info',
    status = 'unread',
    cfu_value = null,
    threshold = null,
  } = payload;

  const [result] = await pool.query(
    `INSERT INTO notifications (sensor_id, message, severity, status, cfu_value, threshold)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [sensor_id, message, severity, status, cfu_value, threshold]
  );

  // return inserted row
  const [rows] = await pool.query(
    `SELECT id, sensor_id, message, severity, status, cfu_value, threshold, created_at, read_at, resolved_at
     FROM notifications WHERE id = ?`,
    [result.insertId]
  );
  return rows[0];
}

async function markAsRead(id) {
  await pool.query(
    `UPDATE notifications SET status='read', read_at = NOW() WHERE id = ?`,
    [id]
  );
  const [rows] = await pool.query(
    `SELECT * FROM notifications WHERE id = ?`,
    [id]
  );
  return rows[0];
}

async function markAsResolved(id) {
  await pool.query(
    `UPDATE notifications SET status='resolved', resolved_at = NOW() WHERE id = ?`,
    [id]
  );
  const [rows] = await pool.query(
    `SELECT * FROM notifications WHERE id = ?`,
    [id]
  );
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
