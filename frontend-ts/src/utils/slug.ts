/**
 * Slug utility — maps course title to URL-friendly slug and back to UUID
 * No backend changes needed.
 */

/* ─── Generate slug from title ─── */
export const toSlug = (title: string): string =>
  title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')    // Remove diacritics
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-z0-9]+/g, '-')        // Non-alphanumeric → dash
    .replace(/^-|-$/g, '')              // Trim leading/trailing dashes
    || 'course'

/* ─── Slug ↔ UUID cache ─── */
const slugToId: Record<string, string> = {}
const idToSlug: Record<string, string> = {}

export const setSlugMap = (courses: { id: string; title: string }[]) => {
  // Clear old cache
  Object.keys(slugToId).forEach((k) => delete slugToId[k])
  Object.keys(idToSlug).forEach((k) => delete idToSlug[k])
  const seen = new Set<string>()
  courses.forEach((c) => {
    let slug = toSlug(c.title)
    // Handle duplicates by appending suffix
    if (seen.has(slug)) {
      let i = 2
      while (seen.has(`${slug}-${i}`)) i++
      slug = `${slug}-${i}`
    }
    seen.add(slug)
    slugToId[slug] = c.id
    idToSlug[c.id] = slug
  })
}

export const resolveSlug = (slug: string): string | undefined => slugToId[slug]
export const getSlugById = (id: string): string | undefined => idToSlug[id]
export const isUuid = (v: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(v)

/**
 * Smart resolve: if input looks like UUID, return it directly.
 * If it's a slug, resolve from cache.
 * Returns the UUID string.
 */
export const resolveToId = (slugOrId: string): string => {
  if (isUuid(slugOrId)) return slugOrId
  return resolveSlug(slugOrId) || slugOrId
}

/**
 * Smart link: if we have slug cached for this ID, use it.
 * Otherwise fall back to UUID.
 */
export const courseSlugOrId = (id: string, title?: string): string => {
  const cached = getSlugById(id)
  if (cached) return cached
  if (title) return toSlug(title)
  return id
}
