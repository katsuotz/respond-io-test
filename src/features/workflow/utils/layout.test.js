import { describe, expect, it } from 'vitest'

import { NODE_TYPES } from '@/features/workflow/constants'
import { layoutGraph } from './layout'

describe('layoutGraph', () => {
  it('centers child subtrees beneath their parent and preserves existing positions', () => {
    const positioned = layoutGraph(
      [
        { id: 'root', type: NODE_TYPES.TRIGGER, data: {} },
        { id: 'branch', type: NODE_TYPES.BRANCH, data: {} },
        { id: 'child', type: NODE_TYPES.SEND_MESSAGE, data: {} },
        { id: 'fixed', type: NODE_TYPES.SEND_MESSAGE, data: {}, position: { x: 12, y: 34 } },
      ],
      [
        { id: 'root-branch', source: 'root', target: 'branch' },
        { id: 'branch-child', source: 'branch', target: 'child' },
      ],
    )
    const branch = positioned.find((node) => node.id === 'branch')
    const child = positioned.find((node) => node.id === 'child')
    const fixed = positioned.find((node) => node.id === 'fixed')

    expect(branch.position.x + 50).toBe(child.position.x + 130)
    expect(branch.position.y).toBe(180)
    expect(child.position.y).toBe(360)
    expect(fixed.position).toEqual({ x: 12, y: 34 })
  })
})
