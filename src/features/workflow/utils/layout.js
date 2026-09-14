import { CANVAS_LAYOUT, NODE_TYPES } from '@/features/workflow/constants'

function getNodeWidth(node) {
  return node.type === NODE_TYPES.BRANCH ? CANVAS_LAYOUT.branchWidth : CANVAS_LAYOUT.nodeWidth
}

function getParentMap(edges) {
  const parentById = new Map()
  for (const edge of edges) {
    if (!parentById.has(String(edge.target)))
      parentById.set(String(edge.target), String(edge.source))
  }
  return parentById
}

function getSubtreeWidth(nodeId, nodesById, childrenById, cache, visiting = new Set()) {
  if (cache.has(nodeId)) return cache.get(nodeId)
  if (visiting.has(nodeId)) return getNodeWidth(nodesById.get(nodeId))

  visiting.add(nodeId)
  const node = nodesById.get(nodeId)
  const children = childrenById.get(nodeId) ?? []
  const childWidth = children.reduce((total, childId, index) => {
    const gap = index === 0 ? 0 : CANVAS_LAYOUT.horizontalGap
    return total + gap + getSubtreeWidth(childId, nodesById, childrenById, cache, visiting)
  }, 0)
  visiting.delete(nodeId)

  const width = Math.max(getNodeWidth(node), childWidth)
  cache.set(nodeId, width)
  return width
}

function hasPosition(node) {
  return (
    node.position &&
    Number.isFinite(Number(node.position.x)) &&
    Number.isFinite(Number(node.position.y))
  )
}

export function layoutGraph(nodes, edges = []) {
  const nodesById = new Map(nodes.map((node) => [String(node.id), node]))
  const parentById = getParentMap(edges)
  const childrenById = new Map()
  for (const [childId, parentId] of parentById) {
    if (!nodesById.has(parentId)) continue
    const children = childrenById.get(parentId) ?? []
    children.push(childId)
    childrenById.set(parentId, children)
  }
  for (const children of childrenById.values())
    children.sort((left, right) => left.localeCompare(right))

  const widthCache = new Map()
  const roots = nodes
    .filter(
      (node) => !parentById.has(String(node.id)) || !nodesById.has(parentById.get(String(node.id))),
    )
    .sort((left, right) => String(left.id).localeCompare(String(right.id)))
  const rootGap = CANVAS_LAYOUT.horizontalGap
  const rootWidth = roots.reduce((total, root, index) => {
    const gap = index === 0 ? 0 : rootGap
    return total + gap + getSubtreeWidth(String(root.id), nodesById, childrenById, widthCache)
  }, 0)
  const positions = new Map()

  function positionSubtree(nodeId, left, depth) {
    const node = nodesById.get(nodeId)
    const subtreeWidth = getSubtreeWidth(nodeId, nodesById, childrenById, widthCache)
    const nodeWidth = getNodeWidth(node)
    if (!hasPosition(node)) {
      positions.set(nodeId, {
        x: Math.max(0, left + (subtreeWidth - nodeWidth) / 2),
        y: depth * CANVAS_LAYOUT.verticalGap,
      })
    }

    const children = childrenById.get(nodeId) ?? []
    const childrenWidth = children.reduce((total, childId, index) => {
      const gap = index === 0 ? 0 : CANVAS_LAYOUT.horizontalGap
      return total + gap + getSubtreeWidth(childId, nodesById, childrenById, widthCache)
    }, 0)
    let childLeft = left + Math.max(0, (subtreeWidth - childrenWidth) / 2)
    for (const childId of children) {
      positionSubtree(childId, childLeft, depth + 1)
      childLeft +=
        getSubtreeWidth(childId, nodesById, childrenById, widthCache) + CANVAS_LAYOUT.horizontalGap
    }
  }

  let rootLeft = Math.max(0, 520 - rootWidth / 2)
  for (const root of roots) {
    const rootId = String(root.id)
    positionSubtree(rootId, rootLeft, 0)
    rootLeft += getSubtreeWidth(rootId, nodesById, childrenById, widthCache) + rootGap
  }

  return nodes.map((node) => ({
    ...node,
    data: { ...node.data },
    position: hasPosition(node)
      ? { x: Number(node.position.x), y: Number(node.position.y) }
      : (positions.get(String(node.id)) ?? { x: 0, y: 0 }),
  }))
}

export function getNextNodePosition(graph) {
  const nodeCount = graph.nodes.length
  const branchCount = graph.nodes.filter((node) => node.type === NODE_TYPES.BRANCH).length
  return {
    x:
      120 +
      ((nodeCount - branchCount) % 3) * (CANVAS_LAYOUT.nodeWidth + CANVAS_LAYOUT.horizontalGap),
    y: 140 + Math.floor((nodeCount - branchCount) / 3) * CANVAS_LAYOUT.verticalGap,
  }
}
