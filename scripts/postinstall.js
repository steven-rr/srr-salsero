const fs = require('fs');
const path = require('path');

// Patch @discordjs/voice to await DAVE library loading before identifying
// Without this, the bot sends max_dave_protocol_version: 0 and Discord rejects the connection
const voicePath = path.join(__dirname, '..', 'node_modules', '@discordjs', 'voice', 'dist', 'index.js');
if (fs.existsSync(voicePath)) {
  let code = fs.readFileSync(voicePath, 'utf8');
  if (!code.includes('await daveLoadPromise')) {
    code = code.replace(
      'onWsOpen() {',
      'async onWsOpen() {\n    await daveLoadPromise;'
    );
    fs.writeFileSync(voicePath, code);
    console.log('[postinstall] Patched @discordjs/voice: await daveLoadPromise in onWsOpen');
  }
}

// Patch @distube/yt-dlp to fix deprecated flags and add search support
const ytdlpPath = path.join(__dirname, '..', 'node_modules', '@distube', 'yt-dlp', 'dist', 'index.js');
if (fs.existsSync(ytdlpPath)) {
  let code = fs.readFileSync(ytdlpPath, 'utf8');
  let patched = false;

  // Remove deprecated --no-call-home flag
  if (code.includes('noCallHome: true,')) {
    code = code.replace(/\s*noCallHome: true,/g, '');
    patched = true;
  }

  // Add default YouTube search for non-URL queries
  if (!code.includes('defaultSearch')) {
    code = code.replace(
      'dumpSingleJson: true,\n      noWarnings: true,',
      'dumpSingleJson: true,\n      noWarnings: true,\n      defaultSearch: "ytsearch",\n      noPlaylist: true,'
    );
    patched = true;
  }

  if (patched) {
    fs.writeFileSync(ytdlpPath, code);
    console.log('[postinstall] Patched @distube/yt-dlp: removed noCallHome, added defaultSearch and noPlaylist');
  }
}
