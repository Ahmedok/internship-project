import { type UpdatePreferenceInput } from '@inventory/shared';

export async function syncUserPreferences(data: UpdatePreferenceInput) {
    const res = await fetch('/api/users/me/preferences', {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        throw new Error('Failed to update user preferences');
    }

    return res.json();
}
