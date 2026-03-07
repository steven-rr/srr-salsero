const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const idleTimers = new Map();

function clearIdleTimer(guildId) {
  const timer = idleTimers.get(guildId);
  if (timer) {
    clearTimeout(timer);
    idleTimers.delete(guildId);
  }
}

function startIdleTimer(guildId, callback) {
  clearIdleTimer(guildId);
  const timer = setTimeout(() => {
    idleTimers.delete(guildId);
    callback();
  }, IDLE_TIMEOUT_MS);
  idleTimers.set(guildId, timer);
}

module.exports = { clearIdleTimer, startIdleTimer };
