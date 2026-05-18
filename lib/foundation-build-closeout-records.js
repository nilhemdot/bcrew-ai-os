import { agentFeedbackCloseoutRecords } from './foundation-build-closeout-agent-feedback-records.js'
import { controlLayerCloseoutRecords } from './foundation-build-closeout-control-layer-records.js'
import { doctrineCleanupCloseoutRecords } from './foundation-build-closeout-doctrine-cleanup-records.js'
import { foundationSurfaceCloseoutRecords } from './foundation-build-closeout-foundation-surface-records.js'
import { processGateCloseoutRecords } from './foundation-build-closeout-process-gate-records.js'
import { sourceOnceOverCloseoutRecords } from './foundation-build-closeout-source-once-over-records.js'
import { actionRouteCloseoutRecords } from './foundation-build-closeout-action-route-records.js'
import { buildLaneCloseoutRecords } from './foundation-build-closeout-build-lane-records.js'
import { cleanupCloseoutRecords } from './foundation-build-closeout-cleanup-records.js'
import { controlPlaneCloseoutRecords } from './foundation-build-closeout-control-plane-records.js'
import { overnightCloseoutRecords } from './foundation-build-closeout-overnight-records.js'
import { sizeCloseoutRecords } from './foundation-build-closeout-size-records.js'
import { sourceCloseoutRecords } from './foundation-build-closeout-source-records.js'
import { verifierTighteningCloseoutRecords } from './foundation-build-closeout-tightening-records.js'

export const FOUNDATION_BUILD_CLOSEOUT_SCHEMA_VERSION = 2

export const closeoutRecords = [
  ...actionRouteCloseoutRecords,
  ...buildLaneCloseoutRecords,
  ...cleanupCloseoutRecords,
  ...verifierTighteningCloseoutRecords,
  ...sizeCloseoutRecords,
  ...overnightCloseoutRecords,
  ...controlPlaneCloseoutRecords,
  ...sourceCloseoutRecords,
  ...sourceOnceOverCloseoutRecords,
  ...processGateCloseoutRecords,
  ...doctrineCleanupCloseoutRecords,
  ...controlLayerCloseoutRecords,
  ...agentFeedbackCloseoutRecords,
  ...foundationSurfaceCloseoutRecords,
]
