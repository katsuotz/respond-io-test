import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import {
  BRANCH_CONNECTOR_TYPES,
  DEFAULT_BUSINESS_HOURS,
  NODE_TYPES,
  USER_NODE_TYPES,
} from '@/features/workflow/constants'
import { fetchWorkflowPayload } from '@/features/workflow/services/workflowApi'
import { loadWorkflow, persistWorkflow } from '@/features/workflow/services/workflowPersistence'
import { cloneValue } from '@/features/workflow/utils/clone'
import { getNextNodePosition } from '@/features/workflow/utils/layout'
import { normalizeGraph, normalizePayload } from '@/features/workflow/utils/normalize'
import { validateConnection, validateNode } from '@/features/workflow/utils/validation'

function createId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`
}

function createDefaultData(type) {
  if (type === NODE_TYPES.SEND_MESSAGE) return { payload: [] }
  if (type === NODE_TYPES.ADD_COMMENT) return { comment: '' }
  if (type === NODE_TYPES.BUSINESS_HOURS) return cloneValue(DEFAULT_BUSINESS_HOURS)
  return {}
}

function createBranchNode(ownerId, connectorType, position) {
  return {
    id: createId(connectorType),
    type: NODE_TYPES.BRANCH,
    title: connectorType === BRANCH_CONNECTOR_TYPES.FAILURE ? 'Failure' : 'Success',
    description: '',
    position,
    data: { connectorType, ownerId },
  }
}

function getError(error) {
  return error instanceof Error ? error : new Error(String(error))
}

export const useWorkflowStore = defineStore('workflow', () => {
  const graph = ref({ nodes: [], edges: [] })
  const loaded = ref(false)
  const error = ref(null)
  let mutationQueue = Promise.resolve()

  const nodes = computed(() => graph.value.nodes)
  const edges = computed(() => graph.value.edges)

  function enqueueMutation(task) {
    const next = mutationQueue.then(task)
    mutationQueue = next.catch(() => undefined)
    return next
  }

  async function publish(nextGraph) {
    const next = cloneValue(nextGraph)
    await persistWorkflow(next)
    graph.value = next
    error.value = null
    return next
  }

  async function initialize(initialPayload) {
    return enqueueMutation(async () => {
      if (loaded.value) return graph.value
      error.value = null
      try {
        const saved = await loadWorkflow()
        if (saved) graph.value = normalizeGraph(saved)
        else {
          const payload = Array.isArray(initialPayload)
            ? initialPayload
            : await (typeof initialPayload === 'function'
                ? initialPayload()
                : fetchWorkflowPayload())
          graph.value = normalizePayload(payload)
          await persistWorkflow(cloneValue(graph.value))
        }
        loaded.value = true
        return graph.value
      } catch (cause) {
        error.value = getError(cause)
        throw error.value
      }
    })
  }

  async function createNode(input) {
    return enqueueMutation(async () => {
      error.value = null
      try {
        if (!USER_NODE_TYPES.includes(input?.type))
          throw new Error('Only editable node types can be created')
        const node = {
          id: createId('node'),
          type: input.type,
          title: input.title ?? '',
          description: input.description ?? '',
          position: input.position ?? getNextNodePosition(graph.value),
          data: cloneValue(input.data ?? createDefaultData(input.type)),
        }
        const validationErrors = validateNode(node)
        if (Object.keys(validationErrors).length) {
          const validationError = new Error('Node validation failed')
          validationError.fields = validationErrors
          throw validationError
        }

        const nextGraph = cloneValue(graph.value)
        nextGraph.nodes.push(node)
        if (node.type === NODE_TYPES.BUSINESS_HOURS) {
          const success = createBranchNode(node.id, BRANCH_CONNECTOR_TYPES.SUCCESS, {
            x: node.position.x - 170,
            y: node.position.y + 180,
          })
          const failure = createBranchNode(node.id, BRANCH_CONNECTOR_TYPES.FAILURE, {
            x: node.position.x + 170,
            y: node.position.y + 180,
          })
          nextGraph.nodes.push(success, failure)
          nextGraph.edges.push(
            { id: `edge-${node.id}-${success.id}`, source: node.id, target: success.id },
            { id: `edge-${node.id}-${failure.id}`, source: node.id, target: failure.id },
          )
        }
        await publish(nextGraph)
        return node
      } catch (cause) {
        error.value = getError(cause)
        throw error.value
      }
    })
  }

  async function saveNode(input) {
    return enqueueMutation(async () => {
      error.value = null
      try {
        const nodeIndex = graph.value.nodes.findIndex(
          (node) => String(node.id) === String(input?.id),
        )
        if (nodeIndex === -1) throw new Error('Node does not exist')
        const current = graph.value.nodes[nodeIndex]
        if (current.type === NODE_TYPES.BRANCH) throw new Error('Branch nodes cannot be edited')
        if (input.type && input.type !== current.type)
          throw new Error('Node type cannot be changed')
        const nextNode = {
          ...cloneValue(current),
          ...cloneValue(input),
          id: current.id,
          type: current.type,
          position: input.position ?? current.position,
          data: cloneValue(input.data ?? current.data),
        }
        const validationErrors = validateNode(nextNode)
        if (Object.keys(validationErrors).length) {
          const validationError = new Error('Node validation failed')
          validationError.fields = validationErrors
          throw validationError
        }
        const nextGraph = cloneValue(graph.value)
        nextGraph.nodes[nodeIndex] = nextNode
        await publish(nextGraph)
        return nextNode
      } catch (cause) {
        error.value = getError(cause)
        throw error.value
      }
    })
  }

  async function deleteNode(id) {
    return enqueueMutation(async () => {
      error.value = null
      try {
        const node = graph.value.nodes.find((candidate) => String(candidate.id) === String(id))
        if (!node) throw new Error('Node does not exist')
        if (node.type === NODE_TYPES.BRANCH)
          throw new Error('Branch nodes are managed by business hours')

        const deletedIds = new Set([String(node.id)])
        if (node.type === NODE_TYPES.BUSINESS_HOURS) {
          for (const child of graph.value.nodes) {
            if (child.type === NODE_TYPES.BRANCH && String(child.data?.ownerId) === String(node.id))
              deletedIds.add(String(child.id))
          }
        }
        const nextGraph = {
          nodes: graph.value.nodes.filter((candidate) => !deletedIds.has(String(candidate.id))),
          edges: graph.value.edges.filter(
            (edge) => !deletedIds.has(String(edge.source)) && !deletedIds.has(String(edge.target)),
          ),
        }
        await publish(nextGraph)
        return id
      } catch (cause) {
        error.value = getError(cause)
        throw error.value
      }
    })
  }

  async function connect(connection) {
    return enqueueMutation(async () => {
      error.value = null
      try {
        const validationError = validateConnection(graph.value, connection)
        if (validationError) throw new Error(validationError)
        const source = String(connection.source)
        const target = String(connection.target)
        const nextGraph = cloneValue(graph.value)
        nextGraph.edges.push({ id: `edge-${source}-${target}`, source, target })
        await publish(nextGraph)
        return nextGraph.edges.at(-1)
      } catch (cause) {
        error.value = getError(cause)
        throw error.value
      }
    })
  }

  async function disconnect(edgeId) {
    return enqueueMutation(async () => {
      error.value = null
      try {
        const edge = graph.value.edges.find((candidate) => String(candidate.id) === String(edgeId))
        if (!edge) throw new Error('Connection does not exist')
        const targetNode = graph.value.nodes.find((node) => String(node.id) === String(edge.target))
        if (
          targetNode?.type === NODE_TYPES.BRANCH &&
          String(targetNode.data?.ownerId) === String(edge.source)
        ) {
          throw new Error('Business-hours branch connections cannot be removed')
        }
        const nextGraph = cloneValue(graph.value)
        nextGraph.edges = nextGraph.edges.filter(
          (candidate) => String(candidate.id) !== String(edgeId),
        )
        await publish(nextGraph)
        return edgeId
      } catch (cause) {
        error.value = getError(cause)
        throw error.value
      }
    })
  }

  async function reconnectEdge(edgeId, connection) {
    return enqueueMutation(async () => {
      error.value = null
      try {
        const edge = graph.value.edges.find((candidate) => String(candidate.id) === String(edgeId))
        if (!edge) throw new Error('Connection does not exist')
        const targetNode = graph.value.nodes.find((node) => String(node.id) === String(edge.target))
        if (
          targetNode?.type === NODE_TYPES.BRANCH &&
          String(targetNode.data?.ownerId) === String(edge.source)
        ) {
          throw new Error('Business-hours branch connections cannot be changed')
        }

        const graphWithoutEdge = {
          ...graph.value,
          edges: graph.value.edges.filter((candidate) => String(candidate.id) !== String(edgeId)),
        }
        const validationError = validateConnection(graphWithoutEdge, connection)
        if (validationError) throw new Error(validationError)
        const source = String(connection.source)
        const target = String(connection.target)
        const nextGraph = cloneValue(graphWithoutEdge)
        nextGraph.edges.push({ id: String(edgeId), source, target })
        await publish(nextGraph)
        return nextGraph.edges.at(-1)
      } catch (cause) {
        error.value = getError(cause)
        throw error.value
      }
    })
  }

  async function moveNode(id, position) {
    return enqueueMutation(async () => {
      error.value = null
      try {
        const x = Number(position?.x)
        const y = Number(position?.y)
        if (!Number.isFinite(x) || !Number.isFinite(y))
          throw new Error('Node position must contain numbers')
        const nodeIndex = graph.value.nodes.findIndex((node) => String(node.id) === String(id))
        if (nodeIndex === -1) throw new Error('Node does not exist')
        const nextGraph = cloneValue(graph.value)
        nextGraph.nodes[nodeIndex].position = { x, y }
        await publish(nextGraph)
        return nextGraph.nodes[nodeIndex]
      } catch (cause) {
        error.value = getError(cause)
        throw error.value
      }
    })
  }

  return {
    graph,
    nodes,
    edges,
    loaded,
    error,
    initialize,
    createNode,
    saveNode,
    deleteNode,
    connect,
    disconnect,
    reconnectEdge,
    moveNode,
  }
})
