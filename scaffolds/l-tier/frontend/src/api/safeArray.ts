/**
 * Null-safe array helpers.
 *
 * Why this exists: TypeScript declarations on API responses say `items: Foo[]`,
 * but at runtime `fetch().json()` can return `{ items: undefined }` (partial
 * responses, missing fields, first-paint before the hook resolves). Calling
 * `items.map(...)` then crashes with `Cannot read properties of undefined`.
 *
 * Use `safeArray(items)` (or its JSX-friendly alias `mapSafe`) at every list
 * iteration site so the View never blows up:
 *
 *   {safeArray(data?.cards).map(card => <Card key={card.id} card={card} />)}
 *
 *   const sorted = [...safeArray(alerts)].sort(byCreatedAt);
 *
 *   const visible = safeArray(items).filter(i => !i.hidden);
 */

export function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Sugar for the common `safeArray(x).map(fn)` pattern in JSX.
 *
 *   {mapSafe(data?.cards, card => <Card key={card.id} card={card} />)}
 */
export function mapSafe<T, U>(
  value: T[] | null | undefined,
  fn: (item: T, index: number, array: T[]) => U,
): U[] {
  return safeArray(value).map(fn);
}

/**
 * `true` when the value is a non-empty array. Useful for `loading` / `empty`
 * branches:
 *
 *   if (!hasItems(data?.cards)) return <EmptyState />;
 */
export function hasItems<T>(value: T[] | null | undefined): value is T[] {
  return Array.isArray(value) && value.length > 0;
}
