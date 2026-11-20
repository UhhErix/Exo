// Fixed ids and links. None is a secret. The guild and application ids are wrangler vars (GUILD_ID, DISCORD_APPLICATION_ID).
// #open-a-ticket is named in replies. #mod-log is not used: the bot writes no log about members.
export const CHANNELS = Object.freeze({
  help: '1564009068547281016',
  bugs: '1563262009359867924',
  ideas: '1563262016896892948',
  ticket: '1563235566378553405',
});

export const LINKS = Object.freeze({
  launcher: 'https://getexo.app/download/launcher',
  cinema: 'https://getexo.app/download/cinema',
  download: 'https://getexo.app/download',
  help: 'https://getexo.app/help',
});

export const UPDATES = Object.freeze({
  launcher: 'https://updates.getexo.app/v1/launcher/latest',
  cinema: 'https://updates.getexo.app/v1/cinema/latest',
});

export const DRIVERS_URL = 'https://drivers.getexo.app/v1/latest';

// Chosen in cloud/bot/README.md ("Model"): a current instruct model with no reasoning phase, not on the 2026-11-20 deprecation list.
export const MODEL = '@cf/mistralai/mistral-small-3.1-24b-instruct';
