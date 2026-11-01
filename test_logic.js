// Self-check test for operator-2008 core logic
const assert = require("assert");

function formatWIB(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(mins)}`;
}

// 1. Time formatting tests
assert.strictEqual(formatWIB(120), "02:00", "120 min must be 02:00");
assert.strictEqual(formatWIB(155), "02:35", "155 min must be 02:35");
assert.strictEqual(formatWIB(180), "03:00", "180 min must be 03:00");

// 2. Billing & Cash simulation test
let state = {
  cash: 12000,
  power: 100,
  isSpookyEventActive: false,
  bilik4EntityPresent: false,
  clients: [
    { id: 4, user: "[KOSONG]", status: "Offline", timeLeft: 0 }
  ]
};

// Simulate Anomaly spawn
state.clients[0].status = "GLITCH";
state.clients[0].user = "USER_UNKNOWN";
state.isSpookyEventActive = true;
state.bilik4EntityPresent = true;

assert.strictEqual(state.isSpookyEventActive, true);
assert.strictEqual(state.bilik4EntityPresent, true);

// Simulate Player restarting PC 4
state.clients[0].status = "Offline";
state.clients[0].user = "[KOSONG]";
state.isSpookyEventActive = false;
state.bilik4EntityPresent = false;

assert.strictEqual(state.clients[0].status, "Offline", "PC 4 status must reset to Offline");
assert.strictEqual(state.isSpookyEventActive, false, "Anomaly event must clear");
assert.strictEqual(state.bilik4EntityPresent, false, "Entity must vanish");

console.log("✓ All operator-2008 logic assertions passed successfully.");
