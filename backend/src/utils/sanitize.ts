import DOMPurify from 'isomorphic-dompurify';

export function sanitizeInput(input: string | undefined | null): string {
    if (!input) return '';
    return DOMPurify.sanitize(input);
}
