/**
 * In-memory state manager for conversational bot flows.
 * Uses a Map where keys are Telegram Chat IDs.
 * Values are objects containing the current step and accumulated data.
 */

class StateManager {
  constructor() {
    this.states = new Map();
  }

  get(chatId) {
    return this.states.get(chatId) || null;
  }

  set(chatId, stateObject) {
    this.states.set(chatId, stateObject);
  }

  update(chatId, updates) {
    const currentState = this.get(chatId) || {};
    this.states.set(chatId, { ...currentState, ...updates });
  }

  delete(chatId) {
    this.states.delete(chatId);
  }
}

export default new StateManager();
