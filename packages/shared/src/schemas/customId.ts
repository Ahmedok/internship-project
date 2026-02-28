import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

export const IdElementTypeEnum = z.enum([
    'FIXED_TEXT',
    'RANDOM_20BIT',
    'RANDOM_32BIT',
    'RANDOM_6DIGIT',
    'RANDOM_9DIGIT',
    'GUID',
    'DATETIME',
    'SEQUENCE',
]);

export type IdElementType = z.infer<typeof IdElementTypeEnum>;

export const IdElementConfigSchema = z.object({
    value: z.string().optional(), // for FIXED_TEXT
    format: z.string().optional(), // for DATETIME
    padding: z.number().int().min(1).max(10).optional(), // for SEQUENCE
});

export const CustomIdElementSchema = z.object({
    id: z.uuid().optional(),
    elementType: IdElementTypeEnum,
    config: IdElementConfigSchema,
    sortOrder: z.number().int(),
});

export type CustomIdElementInput = z.infer<typeof CustomIdElementSchema>;

export function generateCustomId(
    elements: CustomIdElementInput[],
    sequenceValue: number = 1,
): string {
    if (!elements || elements.length === 0) return uuidv4();

    const sorted = [...elements].sort((a, b) => a.sortOrder - b.sortOrder);

    return sorted
        .map((el) => {
            switch (el.elementType) {
                case 'FIXED_TEXT':
                    return el.config.value || '';
                case 'RANDOM_20BIT':
                    return Math.random()
                        .toString(16)
                        .substring(2, 7)
                        .toUpperCase();
                case 'RANDOM_32BIT':
                    return Math.random()
                        .toString(16)
                        .substring(2, 10)
                        .toUpperCase();
                case 'RANDOM_6DIGIT':
                    return Math.floor(
                        100_000 + Math.random() * 900_000,
                    ).toString();
                case 'RANDOM_9DIGIT':
                    return Math.floor(
                        100_000_000 + Math.random() * 900_000_000,
                    ).toString();
                case 'GUID':
                    return uuidv4();
                case 'DATETIME':
                    const date = new Date();
                    const format = el.config.format || 'YYYY';
                    return format
                        .replace('YYYY', date.getFullYear().toString())
                        .replace(
                            'MM',
                            (date.getMonth() + 1).toString().padStart(2, '0'),
                        )
                        .replace(
                            'DD',
                            date.getDate().toString().padStart(2, '0'),
                        );
                case 'SEQUENCE':
                    const pad = el.config.padding || 1;
                    return sequenceValue.toString().padStart(pad, '0');
                default:
                    return '';
            }
        })
        .join('');
}

export function validateCustomId(
    value: string,
    elements: CustomIdElementInput[],
): boolean {
    if (!elements || elements.length === 0) return true;

    const sorted = [...elements].sort((a, b) => a.sortOrder - b.sortOrder);
    let regexStr = '^';

    for (const el of sorted) {
        switch (el.elementType) {
            case 'FIXED_TEXT':
                const safeStr = (el.config.value || '').replace(
                    /[.*+?^${}()|[\]\\]/g,
                    '\\$&',
                );
                regexStr += safeStr;
                break;
            case 'RANDOM_20BIT':
                regexStr += '[0-9A-Fa-f]{5}';
                break;
            case 'RANDOM_32BIT':
                regexStr += '[0-9A-Fa-f]{8}';
                break;
            case 'RANDOM_6DIGIT':
                regexStr += '\\d{6}';
                break;
            case 'RANDOM_9DIGIT':
                regexStr += '\\d{9}';
                break;
            case 'GUID':
                regexStr +=
                    '[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[1-5][0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}';
                break;
            case 'DATETIME':
                const frmt = el.config.format || 'YYYY';
                let dtRegex = frmt
                    .replace('YYYY', '\\d{4}')
                    .replace('MM', '\\d{2}')
                    .replace('DD', '\\d{2}')
                    .replace(/[-/]/g, '\\$&');
                regexStr += dtRegex;
                break;
            case 'SEQUENCE':
                const pad = el.config.padding || 1;
                regexStr += `\\d{${pad},}`;
                break;
        }
    }
    regexStr += '$';

    try {
        const regex = new RegExp(regexStr);
        return regex.test(value);
    } catch (e) {
        console.error('Regex compilation error for custom ID validation', e);
        return false;
    }
}
