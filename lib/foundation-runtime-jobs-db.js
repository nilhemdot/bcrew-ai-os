import { createFoundationLlmRuntimeStore } from './foundation-llm-runtime-store.js'
import { createFoundationRuntimeJobStore } from './foundation-runtime-job-store.js'
import {
  foundationPoolHandle as pool,
  insertChangeEvent,
  withFoundationTransaction,
} from './foundation-db-core.js'

const foundationLlmRuntimeStore = createFoundationLlmRuntimeStore({
  pool,
  withFoundationTransaction,
  insertChangeEvent,
})

export const upsertLlmCredential = foundationLlmRuntimeStore.upsertLlmCredential
export const upsertLlmRoute = foundationLlmRuntimeStore.upsertLlmRoute
export const recordLlmRouteProbe = foundationLlmRuntimeStore.recordLlmRouteProbe
export const createLlmCall = foundationLlmRuntimeStore.createLlmCall
export const finishLlmCall = foundationLlmRuntimeStore.finishLlmCall
export const listLlmCalls = foundationLlmRuntimeStore.listLlmCalls
export const getLlmRuntimeSnapshot = foundationLlmRuntimeStore.getLlmRuntimeSnapshot
export const getStaleLlmCalls = foundationLlmRuntimeStore.getStaleLlmCalls
export const markStaleLlmCalls = foundationLlmRuntimeStore.markStaleLlmCalls

const foundationRuntimeJobStore = createFoundationRuntimeJobStore({
  pool,
  withFoundationTransaction,
  insertChangeEvent,
})

export const getFoundationJobScheduleIndex = foundationRuntimeJobStore.getFoundationJobScheduleIndex
export const getFoundationJobControl = foundationRuntimeJobStore.getFoundationJobControl
export const recordFoundationRuntimeStatus = foundationRuntimeJobStore.recordFoundationRuntimeStatus
export const getFoundationRuntimeStatus = foundationRuntimeJobStore.getFoundationRuntimeStatus
export const getFoundationJobRunSnapshot = foundationRuntimeJobStore.getFoundationJobRunSnapshot
export const getFoundationJobRunById = foundationRuntimeJobStore.getFoundationJobRunById
export const updateFoundationJobControl = foundationRuntimeJobStore.updateFoundationJobControl
export const updateFoundationJobRunMetadata = foundationRuntimeJobStore.updateFoundationJobRunMetadata
export const createFoundationJobRun = foundationRuntimeJobStore.createFoundationJobRun
export const finishFoundationJobRun = foundationRuntimeJobStore.finishFoundationJobRun
export const markFoundationJobRunStopped = foundationRuntimeJobStore.markFoundationJobRunStopped
export const markStaleFoundationJobRuns = foundationRuntimeJobStore.markStaleFoundationJobRuns
