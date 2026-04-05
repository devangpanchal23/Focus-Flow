import express from 'express';
import { Client } from '@notionhq/client';
import User from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const notion = new Client({
    auth: process.env.NOTION_API_KEY,
    notionVersion: process.env.NOTION_API_VERSION || '2022-06-28'
});

// Apply auth middleware
router.use(verifyToken);

// Helper to normalize Notion page to event
const normalizeEvent = (page) => {
    try {
        const props = page.properties;
        let title = 'Untitled Event';
        let date = null;
        let status = null;

        // Find Title Property (usually type 'title')
        const titleProp = Object.values(props).find(p => p.type === 'title');
        if (titleProp && titleProp.title?.length > 0) {
            title = titleProp.title.map(t => t.plain_text).join('');
        }

        // Find Date Property
        const dateProp = Object.values(props).find(p => p.type === 'date');
        if (dateProp && dateProp.date) {
            date = dateProp.date;
        }

        // Find Status Property (optional, type 'status' or 'select')
        const statusProp = Object.values(props).find(p => p.type === 'status' || p.type === 'select');
        if (statusProp) {
            status = statusProp[statusProp.type]?.name;
        }

        // if (!date) return null; // allow dateless items

        return {
            id: page.id,
            title,
            startDate: date ? date.start : null,
            endDate: date ? (date.end || date.start) : null,
            status,
            url: page.url
        };
    } catch (e) {
        console.error('Error normalizing page:', page.id, e);
        return null;
    }
};

// Connect Notion (Save Database ID or Page ID)
router.post('/connect', async (req, res) => {
    try {
        const { databaseId } = req.body;
        if (!databaseId) {
            return res.status(400).json({ message: 'Link/ID is required' });
        }

        let resourceId = databaseId;
        let resourceType = 'database';

        // 1. Try Database Access
        try {
            await notion.databases.retrieve({ database_id: resourceId });
            resourceType = 'database';
        } catch (dbError) {
            // 2. If valid ID but not DB, Try Page Access
            try {
                await notion.pages.retrieve({ page_id: resourceId });
                resourceType = 'page';
            } catch (pageError) {
                console.error('Notion Access Error:', dbError.code, pageError.code);

                // Check if it's a permission/not found issue
                if (dbError.code === 'object_not_found' || pageError.code === 'object_not_found') {
                    return res.status(404).json({
                        message: 'Notion Database or Page not found. Access is likely denied.',
                        details: 'IMPORTANT: You must invite this integration to your Notion Page. Click the "..." menu at the top-right of your Notion page -> "Connections" -> "Connect to" -> Select your integration.'
                    });
                }

                return res.status(400).json({
                    message: 'Could not connect. Please check the ID/Link.',
                    details: pageError.message
                });
            }
        }

        // Save to User
        const user = await User.findOneAndUpdate(
            { userId: req.user.uid },
            {
                $set: {
                    'notionConfig.databaseId': resourceId,
                    'notionConfig.resourceType': resourceType,
                    'notionConfig.isConnected': true,
                    'notionConfig.connectedAt': new Date()
                }
            },
            { new: true, upsert: true }
        );

        res.json({
            message: `Notion ${resourceType} connected successfully`,
            isConnected: true,
            databaseId: resourceId,
            resourceType
        });

    } catch (err) {
        console.error('Connect Error:', err);
        res.status(500).json({ message: err.message });
    }
});

// Disconnect
router.post('/disconnect', async (req, res) => {
    try {
        await User.findOneAndUpdate(
            { userId: req.user.uid },
            {
                $set: {
                    'notionConfig.databaseId': null,
                    'notionConfig.isConnected': false,
                    'notionConfig.resourceType': 'database' // reset default
                }
            }
        );
        res.json({ message: 'Disconnected from Notion' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Helper to get schema props
const getDatabaseSchema = async (databaseId) => {
    const db = await notion.databases.retrieve({ database_id: databaseId });
    const props = db.properties;

    // Find keys by type
    const titleKey = Object.keys(props).find(key => props[key].type === 'title');
    const dateKey = Object.keys(props).find(key => props[key].type === 'date');
    const statusKey = Object.keys(props).find(key => props[key].type === 'status' || props[key].type === 'select');

    return { titleKey, dateKey, statusKey };
};

// Get Config/Status
router.get('/status', async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.user.uid });
        res.json({
            isConnected: user?.notionConfig?.isConnected || false,
            databaseId: user?.notionConfig?.databaseId,
            resourceType: user?.notionConfig?.resourceType || 'database'
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Sync Events/Pages
router.get('/calendar', async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.user.uid });
        if (!user || !user.notionConfig?.isConnected || !user.notionConfig?.databaseId) {
            return res.status(400).json({ message: 'Notion not connected' });
        }

        const dbId = user.notionConfig.databaseId;
        const resourceType = user.notionConfig.resourceType || 'database';

        let events = [];

        if (resourceType === 'page') {
            // Fetch Single Page
            const page = await notion.pages.retrieve({ page_id: dbId });
            const normal = normalizeEvent(page);
            if (normal) events.push(normal);
        } else {
            // Database Mode
            // Dynamic Schema Resolution (Only for DB)
            let schema = { titleKey: 'Name', dateKey: 'Date', statusKey: 'Status' };
            try {
                schema = await getDatabaseSchema(dbId);
            } catch (e) {
                console.error('Failed to fetch schema, using defaults', e);
            }

            const query = {
                database_id: dbId,
                sorts: []
            };

            if (schema.dateKey) {
                query.sorts.push({
                    property: schema.dateKey,
                    direction: "ascending"
                });
            }

            // Use low-level request
            const response = await notion.request({
                path: `databases/${dbId}/query`,
                method: 'POST',
                body: { sorts: query.sorts }
            });

            events = response.results.map(normalizeEvent).filter(e => e !== null);
        }

        res.json(events);

    } catch (err) {
        console.error('Calendar Sync Error:', err);
        res.status(500).json({ message: 'Failed to sync calendar', details: err.message });
    }
});

// Create Page (Event)
router.post('/create', async (req, res) => {
    try {
        const { title, startDate, status } = req.body;

        const user = await User.findOne({ userId: req.user.uid });
        if (!user || !user.notionConfig?.isConnected || !user.notionConfig?.databaseId) {
            return res.status(400).json({ message: 'Notion not connected' });
        }

        const dbId = user.notionConfig.databaseId;
        const resourceType = user.notionConfig.resourceType || 'database';

        if (resourceType === 'page') {
            // Create Sub-Page
            // Note: Creating sub-pages via API doesn't allow setting arbitrary properties easily like DBs.
            // We can set Title. Date/Status aren't standard properties of a Page unless it's in a DB.
            // We will create a basic page with title.
            const response = await notion.pages.create({
                parent: { page_id: dbId },
                properties: {
                    title: [{ text: { content: title } }]
                }
                // We cannot easily set Date/Status on a subpage without it being in a DB.
            });
            // Return normalized (likely won't have date)
            res.json(normalizeEvent(response));
        } else {
            // Database Mode
            const { titleKey, dateKey, statusKey } = await getDatabaseSchema(dbId);

            const properties = {};
            // Title
            if (titleKey) properties[titleKey] = { title: [{ text: { content: title } }] };
            // Date
            if (startDate && dateKey) {
                try {
                    properties[dateKey] = { date: { start: new Date(startDate).toISOString() } };
                } catch (e) { }
            }
            // Status
            if (status && statusKey) {
                properties[statusKey] = { [statusKey === 'select' ? 'select' : 'status']: { name: status } };
            }

            const response = await notion.pages.create({
                parent: { database_id: dbId },
                properties: properties
            });

            res.json(normalizeEvent(response));
        }

    } catch (err) {
        console.error('Create Page Error:', err);
        res.status(500).json({ message: err.message || 'Failed to create event' });
    }
});

// Update Page (Event)
router.post('/update', async (req, res) => {
    try {
        const { id, title, startDate, status } = req.body;
        if (!id) return res.status(400).json({ message: 'Event ID is required' });

        const user = await User.findOne({ userId: req.user.uid });
        if (!user || !user.notionConfig?.isConnected) return res.status(400).json({ message: 'Notion not connected' });

        const dbId = user.notionConfig.databaseId;
        const resourceType = user.notionConfig.resourceType || 'database';

        const properties = {};
        let titleKey = 'Name', dateKey = 'Date', statusKey = 'Status';

        if (resourceType === 'database') {
            // Resolve Schema
            try {
                const schema = await getDatabaseSchema(dbId);
                titleKey = schema.titleKey;
                dateKey = schema.dateKey;
                statusKey = schema.statusKey;
            } catch (e) { }
        } else {
            // Page Mode: We have to guess or check keys. 
            // Standard Page title is usually 'title'. Properties like Date/Status might not exist.
            // But we can try to update 'title' property anyway.
            // On a standalone page, properties are limited unless defined.
            // Usually 'title' is valid.
            titleKey = 'title'; // Standard for page
            dateKey = null; // Pages don't have columns
            statusKey = null;
        }

        if (title && titleKey) properties[titleKey] = { title: [{ text: { content: title } }] };

        // Only update date/status if they exist in schema (always true for DB with valid schema, likely false for Page)
        if (resourceType === 'database') {
            if (startDate && dateKey) properties[dateKey] = { date: { start: new Date(startDate).toISOString() } };
            if (status && statusKey) properties[statusKey] = { [statusKey === 'select' ? 'select' : 'status']: { name: status } };
        }

        const response = await notion.pages.update({
            page_id: id,
            properties: properties
        });

        res.json(normalizeEvent(response));

    } catch (err) {
        console.error('Update Page Error:', err);
        res.status(500).json({ message: err.message || 'Failed to update event' });
    }
});

// Append Content to Page (Block)
router.post('/append-content', async (req, res) => {
    try {
        const { id, content } = req.body;

        if (!id) return res.status(400).json({ message: 'Page ID is required' });
        if (!content) return res.status(400).json({ message: 'Content is required' });

        const user = await User.findOne({ userId: req.user.uid });
        if (!user || !user.notionConfig?.isConnected) return res.status(400).json({ message: 'Notion not connected' });

        const response = await notion.blocks.children.append({
            block_id: id,
            children: [
                {
                    object: 'block',
                    type: 'paragraph',
                    paragraph: {
                        rich_text: [
                            {
                                type: 'text',
                                text: {
                                    content: content
                                }
                            }
                        ]
                    }
                }
            ]
        });

        res.json({ message: 'Content added successfully', response });

    } catch (err) {
        console.error('Append Content Error:', err);
        res.status(500).json({ message: err.message || 'Failed to add content' });
    }
});

export default router;
