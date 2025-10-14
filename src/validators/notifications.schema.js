function validateCreateNotification(body) {
  const errors = [];

  if (!body.sensor_id || typeof body.sensor_id !== 'string') {
    errors.push('sensor_id wajib (string)');
  }
  if (!body.message || typeof body.message !== 'string') {
    errors.push('message wajib (string)');
  }

  const allowedSeverity = ['info', 'warning', 'danger'];
  if (body.severity && !allowedSeverity.includes(body.severity)) {
    errors.push("severity harus salah satu dari: 'info','warning','danger'");
  }

  const allowedStatus = ['unread', 'read', 'resolved'];
  if (body.status && !allowedStatus.includes(body.status)) {
    errors.push("status harus salah satu dari: 'unread','read','resolved'");
  }

  if (body.cfu_value !== undefined && body.cfu_value !== null && isNaN(body.cfu_value)) {
    errors.push('cfu_value harus number');
  }
  if (body.threshold !== undefined && body.threshold !== null && isNaN(body.threshold)) {
    errors.push('threshold harus number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = {
  validateCreateNotification,
};
