import { NODE_LIMITS, NODE_TYPES, USER_NODE_TYPES, WEEKDAYS } from '@/features/workflow/constants'

const MAX_ATTACHMENTS = 10
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024
const ACCEPTED_ATTACHMENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
])

function isText(value) {
  return typeof value === 'string'
}

export function validateNode(node) {
  const errors = {}
  const title = typeof node?.title === 'string' ? node.title.trim() : ''
  const description = node?.description ?? ''

  if (!title) errors.title = 'Title is required'
  else if (title.length > NODE_LIMITS.title)
    errors.title = `Title must be ${NODE_LIMITS.title} characters or fewer`

  if (!isText(description)) errors.description = 'Description must be text'
  else if (description.length > NODE_LIMITS.description) {
    errors.description = `Description must be ${NODE_LIMITS.description} characters or fewer`
  }

  if (
    !USER_NODE_TYPES.includes(node?.type) &&
    node?.type !== NODE_TYPES.TRIGGER &&
    node?.type !== NODE_TYPES.BRANCH
  ) {
    errors.type = 'Select a valid node type'
  }

  if (node?.type === NODE_TYPES.SEND_MESSAGE) {
    const payload = node.data?.payload
    if (!Array.isArray(payload)) errors.payload = 'Message payload must be an array'
    else if (
      payload.some(
        (item) =>
          item.type === 'text' && (!isText(item.text) || item.text.length > NODE_LIMITS.text),
      )
    ) {
      errors.text = `Message text must be ${NODE_LIMITS.text} characters or fewer`
    }
    const attachments = payload.filter((item) => item?.type === 'attachment')
    if (attachments.length > MAX_ATTACHMENTS)
      errors.attachments = `You can add up to ${MAX_ATTACHMENTS} attachments`
    else if (
      attachments.some((item) => {
        const value = item.attachment ?? item
        if (typeof value === 'string') return false
        const type = value?.type ?? value?.file?.type ?? ''
        const size = value?.size ?? value?.file?.size
        return (
          (type && !ACCEPTED_ATTACHMENT_TYPES.has(type)) ||
          (size !== undefined && size > MAX_ATTACHMENT_SIZE)
        )
      })
    ) {
      errors.attachments = 'Attachments must be JPG, PNG, GIF, WebP, or PDF files up to 10 MB'
    }
  }

  if (node?.type === NODE_TYPES.ADD_COMMENT) {
    if (!isText(node.data?.comment)) errors.comment = 'Comment must be text'
    else if (node.data.comment.length > NODE_LIMITS.text)
      errors.comment = `Comment must be ${NODE_LIMITS.text} characters or fewer`
  }

  if (node?.type === NODE_TYPES.BUSINESS_HOURS) {
    if (!isText(node.data?.timezone) || !node.data.timezone.trim())
      errors.timezone = 'Timezone is required'
    else {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: node.data.timezone }).format()
      } catch {
        errors.timezone = 'Timezone is invalid'
      }
    }
    if (!Array.isArray(node.data?.times)) errors.times = 'Business hours must include times'
    else {
      const days = new Set(node.data.times.map((entry) => entry.day))
      if (
        node.data.times.length !== WEEKDAYS.length ||
        days.size !== WEEKDAYS.length ||
        WEEKDAYS.some((day) => !days.has(day))
      )
        errors.times = 'Business hours must include every day once'
      else if (
        node.data.times.some(
          (entry) =>
            !/^([01]\d|2[0-3]):[0-5]\d$/.test(entry.startTime) ||
            !/^([01]\d|2[0-3]):[0-5]\d$/.test(entry.endTime) ||
            entry.startTime >= entry.endTime,
        )
      ) {
        errors.times = 'Each start time must be before its end time'
      }
    }
  }

  return errors
}

function wouldCycle(graph, source, target) {
  const children = new Map()
  for (const edge of graph.edges) {
    const list = children.get(String(edge.source)) ?? []
    list.push(String(edge.target))
    children.set(String(edge.source), list)
  }
  const pending = [target]
  const visited = new Set()
  while (pending.length) {
    const current = pending.pop()
    if (current === source) return true
    if (visited.has(current)) continue
    visited.add(current)
    pending.push(...(children.get(current) ?? []))
  }
  return false
}

export function validateConnection(graph, connection) {
  const source = String(connection?.source ?? '')
  const target = String(connection?.target ?? '')
  if (!source || !target) return 'Both source and target are required'
  if (source === target) return 'A node cannot connect to itself'

  const sourceNode = graph.nodes.find((node) => String(node.id) === source)
  const targetNode = graph.nodes.find((node) => String(node.id) === target)
  if (!sourceNode || !targetNode) return 'Source and target nodes must exist'
  if (targetNode.type === NODE_TYPES.TRIGGER) return 'The trigger cannot receive a connection'
  if (targetNode.type === NODE_TYPES.BRANCH) return 'Branch nodes are display-only targets'
  if (sourceNode.type === NODE_TYPES.BUSINESS_HOURS)
    return 'Business Hours must connect through a branch'
  if (graph.edges.some((edge) => String(edge.source) === source && String(edge.target) === target))
    return 'This connection already exists'
  if (graph.edges.some((edge) => String(edge.target) === target))
    return 'A node can have only one incoming connection'
  if (wouldCycle(graph, source, target)) return 'This connection would create a cycle'

  return null
}
