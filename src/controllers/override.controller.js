const mqtt = require("mqtt");
const pool = require("../models/db");

// ====== Konfigurasi koneksi HiveMQ Cloud ======
// URL: 8ffa42491817425086c0ea5fb025ba07.s1.eu.hivemq.cloud
// TLS MQTT Port: 8883 | TLS Websocket Port: 8884
const MQTT_CONFIG = {
    host: process.env.MQTT_HOST || "8ffa42491817425086c0ea5fb025ba07.s1.eu.hivemq.cloud",
    port: parseInt(process.env.MQTT_PORT || "8883"),
    protocol: "mqtts", // MQTT over TLS
    username: process.env.MQTT_USERNAME || "website",
    password: process.env.MQTT_PASSWORD || "Colivera123",
    clientId: `colivera_backend_${Math.random().toString(16).slice(2, 10)}`,
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 30000,
    keepalive: 60,
    rejectUnauthorized: true, // Validasi SSL certificate
};

console.log("🔧 MQTT Configuration:");
console.log(`   Host: ${MQTT_CONFIG.host}`);
console.log(`   Port: ${MQTT_CONFIG.port}`);
console.log(`   Username: ${MQTT_CONFIG.username}`);
console.log(`   Password: ${"*".repeat(MQTT_CONFIG.password.length)}`);

const mqttClient = mqtt.connect(MQTT_CONFIG);

// Event listener
mqttClient.on("connect", () => {
    console.log("✅ Connected to HiveMQ Cloud Broker");
    console.log(`📡 Host: ${MQTT_CONFIG.host}:${MQTT_CONFIG.port}`);
    console.log(`👤 User: ${MQTT_CONFIG.username}`);
});

mqttClient.on("reconnect", () => {
    console.log("🔄 Reconnecting to HiveMQ Cloud...");
});

mqttClient.on("error", (err) => {
    console.error("❌ MQTT Connection Error:", err.message);
    if (err.message.includes("Not authorized")) {
        console.error("💡 Tip: Periksa username dan password di HiveMQ Cloud Dashboard");
        console.error("💡 Pastikan credentials sudah dibuat di Access Management > Credentials");
    }
});

mqttClient.on("offline", () => {
    console.log("📴 MQTT Client is offline");
});

mqttClient.on("close", () => {
    console.log("🔌 MQTT Connection closed");
});

// ====== Endpoint Manual Override ======
exports.sendOverride = async (req, res) => {
    try {
        // Cek apakah MQTT client sudah connected
        if (!mqttClient.connected) {
            return res.status(503).json({
                success: false,
                message: "MQTT client belum terhubung. Tunggu beberapa saat dan coba lagi.",
            });
        }

        const userId = req.userId; // dari middleware verifyToken
        const topic = "colivera/command/override";
        const payload = JSON.stringify({
            override: true,
            triggered_by: userId || "admin",
            timestamp: new Date().toISOString(),
        });

        // Publish dengan callback untuk memastikan terkirim
        mqttClient.publish(topic, payload, { qos: 1, retain: false }, (err) => {
            if (err) {
                console.error("❌ Failed to publish:", err.message);
            } else {
                console.log(`✅ Message successfully published to ${topic}`);
                console.log(`� Payload:`, payload);
            }
        });

        console.log(`�📡 Override command published to ${topic}`);

        await pool.query(
            "INSERT INTO override_logs (user_id, message) VALUES (?, ?)",
            [userId, "Manual Override triggered"]
        );

        return res.status(200).json({
            success: true,
            message: "Override command sent to HiveMQ",
            topic: topic,
            payload: JSON.parse(payload),
        });
    } catch (err) {
        console.error("Override error:", err);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// ====== Endpoint Get MQTT Status ======
exports.getStatus = async (req, res) => {
    try {
        const isConnected = mqttClient.connected;
        const status = {
            success: true,
            mqtt: {
                connected: isConnected,
                host: MQTT_CONFIG.host,
                port: MQTT_CONFIG.port,
                username: MQTT_CONFIG.username,
                clientId: mqttClient.options.clientId,
            },
            message: isConnected 
                ? 1
                : "MQTT Disconnected - Check credentials or network"
        };

        return res.status(200).json(status);
    } catch (err) {
        console.error("Status check error:", err);
        return res.status(500).json({ 
            success: false, 
            message: "Internal Server Error",
            mqtt: { connected: false }
        });
    }
};
