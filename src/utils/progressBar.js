function progressBar(current, total, length = 20) {
  const progress = Math.round((current / total) * length);
  const filled = '▓'.repeat(progress);
  const empty = '░'.repeat(length - progress);
  return `${filled}${empty}`;
}

module.exports = { progressBar };
