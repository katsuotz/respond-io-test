import 'fake-indexeddb/auto'
import { vi } from 'vitest'

globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
window.matchMedia = vi.fn().mockImplementation((query) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }))
Element.prototype.scrollIntoView = vi.fn()
Element.prototype.hasPointerCapture = vi.fn(() => false)
Element.prototype.setPointerCapture = vi.fn()
Element.prototype.releasePointerCapture = vi.fn()
