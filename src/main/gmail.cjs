const { setTimeout: sleep } = require('node:timers/promises');

function createGmailReader(request, { wait = sleep, random = Math.random } = {}) {
  return async function read(endpoint) {
    for (let attempt = 0; ; attempt++) {
      // Full-message reads cost 60 units; stay below 6,000 units/minute/user.
      await wait(800);
      try {
        return await request(endpoint);
      } catch (error) {
        if (attempt >= 6 || !/quota exceeded|rate.?limit|HTTP 429/i.test(error.message))
          throw error;
        await wait(Math.min(2 ** attempt * 1000, 32000) + Math.floor(random() * 1000));
      }
    }
  };
}

async function readGmailMessages(ids, read) {
  if (
    !Array.isArray(ids) ||
    ids.length > 500 ||
    ids.some((id) => typeof id !== 'string' || !/^[a-f0-9]{1,64}$/i.test(id))
  )
    throw new Error('Invalid Gmail message identifiers.');
  const messages = [];
  for (const id of new Set(ids)) {
    const message = await read(`messages/${id}?format=full`);
    async function calendars(part) {
      if (!part || typeof part !== 'object') return;
      if (
        (part.mimeType === 'text/calendar' || /\.ics$/i.test(part.filename || '')) &&
        part.body?.attachmentId &&
        part.body.size <= 1000000
      ) {
        const attachment = await read(
          `messages/${id}/attachments/${encodeURIComponent(part.body.attachmentId)}`,
        );
        part.body = { ...part.body, data: attachment.data };
      }
      if (Array.isArray(part.parts)) for (const child of part.parts) await calendars(child);
    }
    await calendars(message.payload);
    messages.push(message);
  }
  return messages;
}

module.exports = { createGmailReader, readGmailMessages };
