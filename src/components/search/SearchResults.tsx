import { useState, useEffect } from 'react';
import Fuse from 'fuse.js';

interface SearchEntry {
  title: string;
  subtitle: string;
  tags: string[];
  abbreviations: string[];
  url: string;
}

export default function SearchResults() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchEntry[] | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q') ?? '';
    setQuery(q);

    if (!q) {
      setResults([]);
      return;
    }

    fetch(`${import.meta.env.BASE_URL}/search-index.json`)
      .then(res => res.json())
      .then((data: SearchEntry[]) => {
        const fuse = new Fuse(data, {
          keys: [
            { name: 'title', weight: 2 },
            { name: 'subtitle', weight: 1 },
            { name: 'tags', weight: 1 },
            { name: 'abbreviations', weight: 1.5 },
          ],
          threshold: 0.35,
          ignoreLocation: true,
        });
        setResults(fuse.search(q).map(r => r.item));
      });
  }, []);

  return (
    <div>
      {(results === null) &&
        <p className="text-body">Searching…</p>
      }

      {(results !== null) &&
        <>
          <p className="text-body mb-4">
            {results.length} result{results.length === 1 ? '' : 's'} for &ldquo;{query}&rdquo;
          </p>
          <div className="row">
            {results.map(r =>
              <div className="col-md-6 col-lg-4 mb-4" key={r.url}>
                <a href={r.url} className="card card-plain p-3 text-dark text-decoration-none d-block h-100">
                  <div className="font-weight-bold">{r.title}</div>
                  {(r.subtitle) &&
                    <div className="text-body text-sm">{r.subtitle}</div>
                  }
                </a>
              </div>
            )}
          </div>
          {(results.length === 0) &&
            <p className="text-body">No results found. Try a different search term.</p>
          }
        </>
      }
    </div>
  );
}
