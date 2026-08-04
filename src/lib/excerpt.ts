// Strips basic Markdown syntax and truncates, for content types (like blog
// posts) that don't have a hand-written excerpt field.
export function makeExcerpt(markdown: string, maxLength = 150): string {
  const plain = markdown
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/[#*_>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (plain.length <= maxLength) return plain;
  return plain.slice(0, maxLength).replace(/\s+\S*$/, '') + '…';
}
