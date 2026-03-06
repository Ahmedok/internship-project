import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Input } from './ui/input';

export function GlobalSearchBar() {
    const [query, setQuery] = useState('');
    const navigate = useNavigate();

    const handleSubmit = (e: React.SubmitEvent) => {
        e.preventDefault();
        if (query.trim()) {
            navigate(`/search?q=${encodeURIComponent(query.trim())}`);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="relative w-full max-w-md hidden md:block"
        >
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-zinc-400">
                S {/* TODO: Replace with actual search icon */}
            </div>

            <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Global search..."
                className="pl-10 bg-zinc-100 dark:bg-zinc-800 border-transparent focus-visible:ring-2 focus-visible:bg-white dark:focus-visible:bg-zinc-900 transition-colors"
            />
        </form>
    );
}
