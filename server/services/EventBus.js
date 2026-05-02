import { EventEmitter } from 'events';

class EventBus extends EventEmitter {}

// Create a singleton instance to be shared across the application
const eventBus = new EventBus();

export default eventBus;
