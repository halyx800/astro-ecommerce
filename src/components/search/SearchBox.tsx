import { useState, type FormEvent } from 'react';

export default function SearchBox() {
  const [query, setQuery] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    window.location.href = `${import.meta.env.BASE_URL}search/?q=${encodeURIComponent(query)}`;
  }

  return (
    <form onSubmit={handleSubmit} className="me-2">
      <input
        type="search"
        className="form-control form-control-sm"
        placeholder="Search..."
        aria-label="Search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={{ width: '180px' }}
      />
    </form>
  );
}
