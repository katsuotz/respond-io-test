const applicationBaseUrl = import.meta.env.BASE_URL ?? '/'
export const WORKFLOW_SEED_URL = `${applicationBaseUrl.endsWith('/') ? applicationBaseUrl : `${applicationBaseUrl}/`}data/workflow.json`

export const WORKFLOW_PAYLOAD_URL =
  'https://respond-io-fe-bucket.s3.ap-southeast-1.amazonaws.com/candidate-assessments/payload.json'

export const NODE_TYPES = Object.freeze({
  TRIGGER: 'trigger',
  SEND_MESSAGE: 'sendMessage',
  ADD_COMMENT: 'addComment',
  BUSINESS_HOURS: 'businessHours',
  BRANCH: 'branch',
})

export const USER_NODE_TYPES = Object.freeze([
  NODE_TYPES.SEND_MESSAGE,
  NODE_TYPES.ADD_COMMENT,
  NODE_TYPES.BUSINESS_HOURS,
])

export const BRANCH_CONNECTOR_TYPES = Object.freeze({
  SUCCESS: 'success',
  FAILURE: 'failure',
})

export const WEEKDAYS = Object.freeze(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])

export const DEFAULT_BUSINESS_HOURS = Object.freeze({
  timezone: 'UTC',
  times: WEEKDAYS.map((day) => ({ day, startTime: '09:00', endTime: '17:00' })),
})

export const NODE_LIMITS = Object.freeze({
  title: 100,
  description: 500,
  text: 5000,
})

export const CANVAS_LAYOUT = Object.freeze({
  nodeWidth: 260,
  branchWidth: 100,
  verticalGap: 180,
  horizontalGap: 80,
  branchGap: 320,
})
