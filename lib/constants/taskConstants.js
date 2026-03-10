const TASK_PRIORITY = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3
}

const TASK_STATUS = {
  PENDING: 0,
  IN_PROGRESS: 1,
  COMPLETED: 2
}

const TIMER_PHASE = {
  IDLE: 0,
  FOCUS: 1,
  BREAK: 2,
  AWAITING_COMPLETION: 3
}

const DEFAULT_TASK_STATUS_OPTIONS = [
  { code: TASK_STATUS.PENDING, label: 'Pending' },
  { code: TASK_STATUS.IN_PROGRESS, label: 'In Progress' },
  { code: TASK_STATUS.COMPLETED, label: 'Completed' }
]

module.exports = {
  TASK_PRIORITY,
  TASK_STATUS,
  TIMER_PHASE,
  DEFAULT_TASK_STATUS_OPTIONS
}
