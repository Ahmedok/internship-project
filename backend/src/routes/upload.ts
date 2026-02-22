import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { requireAuth } from '../middleware/auth';

const router = Router();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
});

router.post(
    '/image',
    requireAuth,
    upload.single('file'),
    (req: Request, res: Response) => {
        try {
            if (!req.file) {
                return res
                    .status(400)
                    .json({ error: 'No file detected to upload' });
            }

            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: 'inventory_images' },
                (error, result) => {
                    if (error || !result) {
                        console.error('Cloudinary upload error:', error);
                        return res
                            .status(500)
                            .json({
                                error: 'Error when uploading image to cloud',
                            });
                    }

                    res.status(200).json({ imageUrl: result.secure_url });
                },
            );

            uploadStream.end(req.file.buffer);
        } catch (error) {
            console.error('Image upload route error:', error);
            res.status(500).json({ error: 'Server error during image upload' });
        }
    },
);

export default router;
