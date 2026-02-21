import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('Health Check API', () => {
    it('should return 200 OK with a valid JSON response', async () => {
        const response = await request(app).get('/api/health');
        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/json/);
        expect(response.body).toHaveProperty('status', 'ok');
        expect(typeof response.body.timestamp).toBe('string');
    });

    it('should return 404 for an unknown endpoint', async () => {
        const response = await request(app).get('/api/unknown-route');
        expect(response.status).toBe(404);
    });
});
