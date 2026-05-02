import Notification from '../models/Notification.js';
import eventBus from './EventBus.js';

class NotificationService {
    constructor() {
        this.clients = new Map(); // Map of userId -> Set of Response objects (SSE)

        // Listen to events from the rest of the application
        eventBus.on('PURCHASE_COMPLETED', this.handlePurchase.bind(this));
        // Additional events can be added here (e.g., 'ACHIEVEMENT_UNLOCKED')
    }

    /**
     * Registers a new SSE client connection
     */
    addClient(userId, res) {
        if (!this.clients.has(userId)) {
            this.clients.set(userId, new Set());
        }
        this.clients.get(userId).add(res);

        // Remove client when connection closes
        res.on('close', () => {
            this.removeClient(userId, res);
        });
    }

    removeClient(userId, res) {
        if (this.clients.has(userId)) {
            const userClients = this.clients.get(userId);
            userClients.delete(res);
            if (userClients.size === 0) {
                this.clients.delete(userId);
            }
        }
    }

    /**
     * Pushes a real-time event to all connected clients for a user
     */
    pushToUser(userId, data) {
        const userClients = this.clients.get(userId);
        if (userClients && userClients.size > 0) {
            const payload = `data: ${JSON.stringify(data)}\n\n`;
            userClients.forEach(res => res.write(payload));
        }
    }

    /**
     * Handles the PURCHASE_COMPLETED event
     */
    async handlePurchase(payload) {
        try {
            const { userId, receiptId, amount } = payload;

            const notification = new Notification({
                userId,
                type: 'PURCHASE',
                title: 'Purchase Successful!',
                message: `Your payment of ${amount} was successful. Thank you!`,
                action: {
                    type: 'VIEW_RECEIPT',
                    linkId: receiptId
                }
            });

            await notification.save();

            // Push to connected UI clients
            this.pushToUser(userId, {
                type: 'NEW_NOTIFICATION',
                notification
            });
        } catch (error) {
            console.error('Error handling PURCHASE_COMPLETED event:', error);
        }
    }
}

export default new NotificationService();
