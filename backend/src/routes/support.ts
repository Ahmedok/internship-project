import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/ticket', requireAuth, async (req: Request, res: Response) => {
    try {
        const { summary, priority, inventory, link, adminEmails } = req.body;

        const reportedBy = req.user?.email || 'Unknown User';
        const timestamp = new Date().toISOString();

        const ticketPayload = {
            reportedBy,
            inventory: inventory || 'Global Context',
            link,
            priority,
            summary,
            adminEmails: adminEmails || [],
            timestamp,
        };

        const safeUserId = req.user?.id || 'anonymous';
        const safeTime = timestamp.replace(/[:.]/g, '-');
        const fileName = `ticket_${safeTime}_${safeUserId}.json`;

        const dropboxToken = process.env.DROPBOX_ACCESS_TOKEN;
        if (!dropboxToken) {
            console.error('Dropbox access token is not configured');
            return res
                .status(500)
                .json({ message: 'Cloud storage not configured' });
        }

        const dropboxResponse = await fetch(
            'https://content.dropboxapi.com/2/files/upload',
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${dropboxToken}`,
                    'Content-Type': 'application/octet-stream',
                    'Dropbox-API-Arg': JSON.stringify({
                        path: `/support_tickets/${fileName}`,
                        mode: 'add',
                        autorename: true,
                        mute: false,
                    }),
                },
                body: JSON.stringify(ticketPayload, null, 2),
            },
        );

        if (!dropboxResponse.ok) {
            const errorText = await dropboxResponse.text();
            console.error('Dropbox upload failed:', errorText);
            return res.status(502).json({
                message: 'Failed to upload support ticket to cloud storage',
            });
        }

        return res.status(200).json({ success: true, fileName: fileName });
    } catch (error) {
        console.error('Support ticket error:', error);
        res.status(500).json({
            message: 'Server error when submitting support ticket',
        });
    }
});

export default router;
