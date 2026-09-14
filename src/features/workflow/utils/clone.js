import { isProxy, toRaw } from 'vue'

function toCloneable(value, seen = new WeakMap()) {
  const rawValue = isProxy(value) ? toRaw(value) : value
  if (rawValue === null || typeof rawValue !== 'object') return rawValue
  if (rawValue instanceof Blob || rawValue instanceof Date || rawValue instanceof RegExp)
    return rawValue
  if (seen.has(rawValue)) return seen.get(rawValue)

  const result = Array.isArray(rawValue) ? [] : {}
  seen.set(rawValue, result)
  for (const [key, child] of Object.entries(rawValue)) result[key] = toCloneable(child, seen)
  return result
}

export function cloneValue(value) {
  return structuredClone(toCloneable(value))
}
