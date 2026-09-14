import {
  BRANCH_CONNECTOR_TYPES,
  DEFAULT_BUSINESS_HOURS,
  NODE_TYPES,
} from '@/features/workflow/constants'
import { cloneValue } from './clone'
import { layoutGraph } from './layout'

function asId(value) {
  return value === null || value === undefined ? '' : String(value)
}

function titleFor(rawNode) {
  if (rawNode.name) return rawNode.name
  if (rawNode.type === NODE_TYPES.TRIGGER) return 'Trigger'
  if (rawNode.type === 'dateTimeConnector') {
    return rawNode.data?.connectorType === BRANCH_CONNECTOR_TYPES.FAILURE ? 'Failure' : 'Success'
  }
  return 'Untitled node'
}

function normalizeType(rawType) {
  if (rawType === 'dateTime') return NODE_TYPES.BUSINESS_HOURS
  if (rawType === 'dateTimeConnector') return NODE_TYPES.BRANCH
  return rawType
}

function normalizeData(rawNode, parentId) {
  const source = rawNode.data ?? {}
  const type = normalizeType(rawNode.type)

  if (type === NODE_TYPES.BRANCH) {
    return {
      connectorType: source.connectorType ?? BRANCH_CONNECTOR_TYPES.SUCCESS,
      ownerId: parentId,
    }
  }
  if (type === NODE_TYPES.BUSINESS_HOURS) {
    return {
      times: cloneValue(source.times ?? DEFAULT_BUSINESS_HOURS.times),
      timezone: source.timezone ?? DEFAULT_BUSINESS_HOURS.timezone,
    }
  }
  if (type === NODE_TYPES.SEND_MESSAGE) {
    return { payload: cloneValue(source.payload ?? []) }
  }
  if (type === NODE_TYPES.ADD_COMMENT) {
    return { comment: source.comment ?? '' }
  }
  return cloneValue(source)
}

function assertPersistedGraph(graph) {
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    throw new TypeError('Workflow graph must include nodes and edges arrays')
  }

  const validTypes = new Set(Object.values(NODE_TYPES))
  const nodeIds = new Set()
  for (const node of graph.nodes) {
    if (
      !node ||
      typeof node !== 'object' ||
      node.id === null ||
      node.id === undefined ||
      String(node.id) === ''
    ) {
      throw new TypeError('Workflow graph contains a node without an ID')
    }
    const id = String(node.id)
    if (nodeIds.has(id)) throw new TypeError(`Workflow graph contains duplicate node ID: ${id}`)
    nodeIds.add(id)
    if (!validTypes.has(node.type))
      throw new TypeError(`Workflow graph contains an unknown node type: ${node.type}`)
    if (typeof node.title !== 'string' || typeof node.description !== 'string')
      throw new TypeError(`Workflow node ${id} has invalid text fields`)
    if (
      !node.position ||
      !Number.isFinite(Number(node.position.x)) ||
      !Number.isFinite(Number(node.position.y))
    )
      throw new TypeError(`Workflow node ${id} has an invalid position`)
    if (!node.data || typeof node.data !== 'object' || Array.isArray(node.data))
      throw new TypeError(`Workflow node ${id} has invalid data`)
    if (node.type === NODE_TYPES.SEND_MESSAGE && !Array.isArray(node.data.payload))
      throw new TypeError(`Workflow node ${id} has invalid message data`)
    if (node.type === NODE_TYPES.ADD_COMMENT && typeof node.data.comment !== 'string')
      throw new TypeError(`Workflow node ${id} has invalid comment data`)
    if (
      node.type === NODE_TYPES.BUSINESS_HOURS &&
      (!Array.isArray(node.data.times) || typeof node.data.timezone !== 'string')
    )
      throw new TypeError(`Workflow node ${id} has invalid business-hours data`)
  }

  const edgeIds = new Set()
  const incoming = new Map()
  for (const edge of graph.edges) {
    if (
      !edge ||
      typeof edge !== 'object' ||
      edge.id === null ||
      edge.id === undefined ||
      edge.source === null ||
      edge.target === null
    ) {
      throw new TypeError('Workflow graph contains an invalid edge')
    }
    const edgeId = String(edge.id)
    const source = String(edge.source)
    const target = String(edge.target)
    if (edgeIds.has(edgeId))
      throw new TypeError(`Workflow graph contains duplicate edge ID: ${edgeId}`)
    if (!nodeIds.has(source) || !nodeIds.has(target) || source === target)
      throw new TypeError(`Workflow edge ${edgeId} references invalid nodes`)
    edgeIds.add(edgeId)
    const targets = incoming.get(target) ?? []
    targets.push(source)
    incoming.set(target, targets)
  }
  for (const [target, sources] of incoming) {
    if (sources.length > 1)
      throw new TypeError(`Workflow node ${target} has multiple incoming edges`)
  }

  for (const edge of graph.edges) {
    const source = graph.nodes.find((node) => String(node.id) === String(edge.source))
    const target = graph.nodes.find((node) => String(node.id) === String(edge.target))
    if (target.type === NODE_TYPES.TRIGGER)
      throw new TypeError('The trigger cannot receive a connection')
    if (source.type === NODE_TYPES.BUSINESS_HOURS && target.type !== NODE_TYPES.BRANCH)
      throw new TypeError('Business Hours must connect through a branch')
  }

  const branchEdges = new Set()
  for (const node of graph.nodes) {
    if (node.type !== NODE_TYPES.BRANCH) continue
    const ownerId = String(node.data.ownerId ?? '')
    if (
      ![BRANCH_CONNECTOR_TYPES.SUCCESS, BRANCH_CONNECTOR_TYPES.FAILURE].includes(
        node.data.connectorType,
      )
    )
      throw new TypeError(`Branch ${node.id} has an invalid connector type`)
    const owner = graph.nodes.find((candidate) => String(candidate.id) === ownerId)
    if (!owner || owner.type !== NODE_TYPES.BUSINESS_HOURS)
      throw new TypeError(`Branch ${node.id} has an invalid owner`)
    const ownerEdge = graph.edges.find(
      (edge) => String(edge.source) === ownerId && String(edge.target) === String(node.id),
    )
    if (!ownerEdge) throw new TypeError(`Branch ${node.id} is missing its owner edge`)
    branchEdges.add(String(ownerEdge.id))
  }

  const state = new Map()
  const children = new Map()
  for (const edge of graph.edges) {
    const list = children.get(String(edge.source)) ?? []
    list.push(String(edge.target))
    children.set(String(edge.source), list)
  }
  function visit(id) {
    if (state.get(id) === 'active') throw new TypeError('Workflow graph contains a cycle')
    if (state.get(id) === 'done') return
    state.set(id, 'active')
    for (const child of children.get(id) ?? []) visit(child)
    state.set(id, 'done')
  }
  for (const node of graph.nodes) visit(String(node.id))
  return branchEdges
}

export function normalizePayload(payload) {
  if (!Array.isArray(payload)) throw new TypeError('Workflow payload must be an array')

  const rawNodes = payload.map((rawNode) => {
    const id = asId(rawNode.id)
    const parentId =
      rawNode.parentId === -1 || rawNode.parentId === null || rawNode.parentId === undefined
        ? null
        : asId(rawNode.parentId)
    return {
      id,
      type: normalizeType(rawNode.type),
      title: titleFor(rawNode),
      description: rawNode.description ?? '',
      position: rawNode.position ? { ...rawNode.position } : undefined,
      data: normalizeData(rawNode, parentId),
      _parentId: parentId,
    }
  })

  const nodes = rawNodes.map(({ _parentId, ...node }) => ({
    ...node,
  }))
  const edges = rawNodes
    .filter(({ _parentId }) => _parentId && rawNodes.some((node) => node.id === _parentId))
    .map(({ id, _parentId }) => ({ id: `edge-${_parentId}-${id}`, source: _parentId, target: id }))

  return {
    nodes: layoutGraph(nodes, edges),
    edges,
  }
}

export function normalizeGraph(graph) {
  assertPersistedGraph(graph)

  const edges = graph.edges.map((edge) => ({
    id: String(edge.id ?? `edge-${edge.source}-${edge.target}`),
    source: asId(edge.source),
    target: asId(edge.target),
  }))
  const nodes = graph.nodes.map((node) => ({
    id: asId(node.id),
    type: node.type,
    title: node.title,
    description: node.description ?? '',
    position: node.position
      ? { x: Number(node.position.x) || 0, y: Number(node.position.y) || 0 }
      : undefined,
    data: cloneValue(node.data ?? {}),
  }))

  return { nodes: layoutGraph(nodes, edges), edges }
}
