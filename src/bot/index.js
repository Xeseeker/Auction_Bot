import { setupCommands } from './commands.js';
import { setupCallbacks } from './callbacks.js';

export const startBot = () => {
  console.log('🤖 Starting Telegram Bot Event Listeners...');
  setupCommands();
  setupCallbacks();
};
