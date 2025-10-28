function validateCreateNotification(body) {
  const errors = [];

  // sensor_id wajib INT
  if (!body.sensor_id || isNaN(body.sensor_id)) {
    errors.push("sensor_id wajib (number)");
  }

  if (!body.message || typeof body.message !== "string") {
    errors.push("message wajib (string)");
  }

  // type harus threshold / inactivity
  const allowedType = ["threshold", "inactivity"];
  if (body.type && !allowedType.includes(body.type)) {
    errors.push("type harus salah satu dari: 'threshold' atau 'inactivity'");
  }

  const allowedSeverity = ["info", "warning", "critical"];
  if (body.severity && !allowedSeverity.includes(body.severity)) {
    errors.push("severity harus salah satu dari: 'info','warning','critical'");
  }

  const allowedStatus = ["unread", "read", "resolved"];
  if (body.status && !allowedStatus.includes(body.status)) {
    errors.push("status harus salah satu dari: 'unread','read','resolved'");
  }

  if (body.cfu_value !== undefined && body.cfu_value !== null && isNaN(body.cfu_value)) {
    errors.push("cfu_value harus number");
  }

  if (body.threshold !== undefined && body.threshold !== null && isNaN(body.threshold)) {
    errors.push("threshold harus number");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validateCreateNotification,
};
