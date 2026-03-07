const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const { createEmbed } = require('./embed');
const { formatDuration } = require('./formatDuration');

const SONGS_PER_PAGE = 10;

function buildQueueViewEmbed(queue, page, selectedPos) {
  const current = queue.songs[0];
  const maxPos = queue.songs.length - 1;
  const totalPages = Math.max(1, Math.ceil(maxPos / SONGS_PER_PAGE));
  const clampedPage = Math.min(page, totalPages);

  let title, hint;

  if (selectedPos !== null && selectedPos > 0 && selectedPos <= maxPos) {
    const selectedName = queue.songs[selectedPos].name;
    const truncName = selectedName.length > 40 ? selectedName.slice(0, 37) + '...' : selectedName;
    title = `Moving: ${truncName}`;
    hint = '*Click a position number to place it there:*';
  } else {
    title = 'Queue Manager';
    hint = '*Click a number to select a song:*';
  }

  let description = `**Now Playing:** ${current.name} \`${current.formattedDuration}\`\n${hint}\n`;

  // Show songs as text list
  const start = (clampedPage - 1) * SONGS_PER_PAGE + 1;
  const end = Math.min(start + SONGS_PER_PAGE, queue.songs.length);

  description += '\n';
  for (let pos = start; pos < end; pos++) {
    const song = queue.songs[pos];
    const name = song.name.length > 45 ? song.name.slice(0, 42) + '...' : song.name;
    if (selectedPos !== null && pos === selectedPos) {
      description += `**\`${pos}.\` ${name}** \`${song.formattedDuration}\` ◄\n`;
    } else {
      description += `\`${pos}.\` ${name} \`${song.formattedDuration}\`\n`;
    }
  }

  const totalDuration = queue.songs.reduce((acc, song) => acc + song.duration, 0);

  return createEmbed({
    title,
    description,
    footer: `Page ${clampedPage}/${totalPages} | ${queue.songs.length} songs | Total: ${formatDuration(totalDuration)}`,
  });
}

function buildQueueViewComponents(queue, page, selectedPos) {
  const maxPos = queue.songs.length - 1;
  const rows = [];
  const isMoving = selectedPos !== null && selectedPos > 0 && selectedPos <= maxPos;
  const totalPages = Math.max(1, Math.ceil(maxPos / SONGS_PER_PAGE));
  const clampedPage = Math.min(page, totalPages);

  const start = (clampedPage - 1) * SONGS_PER_PAGE + 1;
  const end = Math.min(start + SONGS_PER_PAGE, queue.songs.length);
  const songsOnPage = end - start;

  if (isMoving) {
    // MOVING MODE: nav → position buttons → action row

    // Nav row first (right below song list)
    if (totalPages > 1) {
      const navRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`qview_mfirst_${selectedPos}_${clampedPage}`)
          .setLabel('⏮ First')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(clampedPage <= 1),
        new ButtonBuilder()
          .setCustomId(`qview_mprev_${selectedPos}_${clampedPage}`)
          .setLabel('◄ Prev')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(clampedPage <= 1),
        new ButtonBuilder()
          .setCustomId(`qview_mpage_${selectedPos}`)
          .setLabel(`${clampedPage} / ${totalPages}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(`qview_mnext_${selectedPos}_${clampedPage}`)
          .setLabel('Next ►')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(clampedPage >= totalPages),
        new ButtonBuilder()
          .setCustomId(`qview_mlast_${selectedPos}_${clampedPage}`)
          .setLabel('Last ⏭')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(clampedPage >= totalPages),
      );
      rows.push(navRow);
    }

    // Position buttons
    const firstRowCount = Math.min(songsOnPage, 5);
    const row1 = new ActionRowBuilder();
    for (let i = 0; i < firstRowCount; i++) {
      const pos = start + i;
      row1.addComponents(
        new ButtonBuilder()
          .setCustomId(`qview_move_${selectedPos}_${pos}_${clampedPage}`)
          .setLabel(String(pos))
          .setStyle(pos === selectedPos ? ButtonStyle.Success : ButtonStyle.Primary)
          .setDisabled(pos === selectedPos)
      );
    }
    rows.push(row1);

    if (songsOnPage > 5) {
      const row2 = new ActionRowBuilder();
      for (let i = 5; i < songsOnPage; i++) {
        const pos = start + i;
        row2.addComponents(
          new ButtonBuilder()
            .setCustomId(`qview_move_${selectedPos}_${pos}_${clampedPage}`)
            .setLabel(String(pos))
            .setStyle(pos === selectedPos ? ButtonStyle.Success : ButtonStyle.Primary)
            .setDisabled(pos === selectedPos)
        );
      }
      rows.push(row2);
    }

    // Action row last
    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`qview_top_${selectedPos}_${clampedPage}`)
        .setLabel('Play Next')
        .setStyle(ButtonStyle.Success)
        .setDisabled(selectedPos === 1),
      new ButtonBuilder()
        .setCustomId(`qview_remove_${selectedPos}_${clampedPage}`)
        .setLabel('Remove')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`qview_cancel_${clampedPage}`)
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary),
    );
    rows.push(actionRow);

  } else {
    // PICK MODE: nav → number buttons → action row

    // Nav row first (right below song list)
    if (totalPages > 1) {
      const navRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`qview_first_${clampedPage}`)
          .setLabel('⏮ First')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(clampedPage <= 1),
        new ButtonBuilder()
          .setCustomId(`qview_prev_${clampedPage}`)
          .setLabel('◄ Prev')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(clampedPage <= 1),
        new ButtonBuilder()
          .setCustomId(`qview_page_info`)
          .setLabel(`${clampedPage} / ${totalPages}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(`qview_next_${clampedPage}`)
          .setLabel('Next ►')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(clampedPage >= totalPages),
        new ButtonBuilder()
          .setCustomId(`qview_last_${clampedPage}`)
          .setLabel('Last ⏭')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(clampedPage >= totalPages),
      );
      rows.push(navRow);
    }

    // Number buttons
    const firstRowCount = Math.min(songsOnPage, 5);
    const row1 = new ActionRowBuilder();
    for (let i = 0; i < firstRowCount; i++) {
      const pos = start + i;
      row1.addComponents(
        new ButtonBuilder()
          .setCustomId(`qview_pick_${pos}_${clampedPage}`)
          .setLabel(String(pos))
          .setStyle(ButtonStyle.Secondary)
      );
    }
    rows.push(row1);

    if (songsOnPage > 5) {
      const row2 = new ActionRowBuilder();
      for (let i = 5; i < songsOnPage; i++) {
        const pos = start + i;
        row2.addComponents(
          new ButtonBuilder()
            .setCustomId(`qview_pick_${pos}_${clampedPage}`)
            .setLabel(String(pos))
            .setStyle(ButtonStyle.Secondary)
        );
      }
      rows.push(row2);
    }

    // Action row last
    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('qview_shuffle')
        .setLabel('Shuffle')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('qview_add')
        .setLabel('Add')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('qview_close')
        .setLabel('Close')
        .setStyle(ButtonStyle.Secondary),
    );
    rows.push(actionRow);
  }

  return rows;
}

function buildAddSongModal() {
  return new ModalBuilder()
    .setCustomId('qview_add_modal')
    .setTitle('Add a Song')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('qview_add_input')
          .setLabel('Song URL or search keywords')
          .setPlaceholder('e.g. never gonna give you up, or a YouTube/Spotify URL')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );
}

module.exports = {
  buildQueueViewEmbed,
  buildQueueViewComponents,
  buildAddSongModal,
};
