function snapshotValue(value, seen = new WeakSet()) {
  if (Array.isArray(value)) return value.map((item) => snapshotValue(item, seen))
  if (
    (typeof File !== 'undefined' && value instanceof File) ||
    (typeof Blob !== 'undefined' && value instanceof Blob)
  ) {
    return {
      name: value.name || '',
      size: value.size,
      type: value.type,
      lastModified: value.lastModified || 0,
    }
  }
  if (value && typeof value === 'object') {
    if (seen.has(value)) return '[Circular]'
    seen.add(value)
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== 'previewUrl')
        .map(([key, item]) => [key, snapshotValue(item, seen)]),
    )
  }
  return value
}

export function snapshot(value) {
  return JSON.stringify(snapshotValue(value))
}
