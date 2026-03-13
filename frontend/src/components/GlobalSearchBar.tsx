import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Input } from './ui/input';
import { TextSearch } from 'lucide-react';

export function GlobalSearchBar({
    translatedPlaceholder,
}: {
    translatedPlaceholder: string;
}) {
    const [query, setQuery] = useState('');
    const navigate = useNavigate();

    const handleSubmit = (e: React.SubmitEvent) => {
        e.preventDefault();
        if (query.trim()) {
            navigate(`/search?q=${encodeURIComponent(query.trim())}`);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                <TextSearch className="size-4" />
            </div>

            <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={translatedPlaceholder}
                className="pl-10 bg-muted border-transparent focus-visible:ring-2 focus-visible:bg-white dark:focus-visible:bg-zinc-900 transition-colors"
            />
        </form>
    );
}
