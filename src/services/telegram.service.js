const axios = require("axios");

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;
const parseMode = process.env.TELEGRAM_PARSE_MODE || "HTML";

function enabled() {
  return Boolean(token && chatId);
}

/**
 * Helper: Get updates untuk mendapatkan chat_id yang benar
 * Panggil endpoint ini, lalu kirim message "/start" ke bot dari Telegram
 */
async function getUpdates() {
  if (!token) {
    return { ok: false, error: "Bot token not configured" };
  }

  try {
    const url = `https://api.telegram.org/bot${token}/getUpdates`;
    const res = await axios.get(url);
    return { ok: true, data: res.data };
  } catch (err) {
    console.error("Get updates error:", err?.response?.data || err.message);
    return { ok: false, error: err?.response?.data || err.message };
  }
}

/**
 * Kirim pesan ke Telegram (aman dipanggil dari mana saja)
 */
async function sendTelegram(text) {
  if (!enabled()) {
    console.warn("⚠️ Telegram not configured (missing token/chatId). Skipped.");
    return { ok: false, skipped: true };
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    console.log(`📤 Sending to Telegram chat: ${chatId}`);
    
    const res = await axios.post(url, {
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: true,
    });
    
    console.log("✅ Telegram message sent successfully!");
    return { ok: true, data: res.data };
  } catch (err) {
    console.error("❌ Telegram send error details:");
    console.error("   Status:", err?.response?.status);
    console.error("   Data:", err?.response?.data);
    console.error("   Message:", err?.message);
    return { ok: false, error: err?.response?.data || err.message };
  }
}

/**
 * Template pesan notifikasi
 */
function formatInactivityNotif({ sensor_name, sensor_id, last_seen, threshold_min }) {
  return [
    "⚠️ <b>Sensor OFFLINE</b>",
    `<b>Sensor:</b> ${sensor_name || `ID ${sensor_id}`}`,
    `<b>Terakhir kirim:</b> ${last_seen || "-"} `,
    `<b>Tanpa data &gt;=</b> ${threshold_min} menit`,
    "",
    "Mohon periksa perangkat / koneksi.",
  ].join("\n");
}

function formatThresholdNotif({ sensor_name, sensor_id, cfu_value, threshold }) {
  return [
    "🚨 <b>PERINGATAN THRESHOLD!</b>",
    `<b>Sensor:</b> ${sensor_name || `ID ${sensor_id}`}`,
    `<b>Nilai CFU:</b> ${cfu_value || "-"}`,
    `<b>Batas Aman:</b> ${threshold || "-"}`,
    "",
    "⚠️ Nilai melebihi ambang batas yang ditentukan.",
  ].join("\n");
}


module.exports = {
  sendTelegram,
  getUpdates,
  formatInactivityNotif,
  formatThresholdNotif,
  enabled,
};
