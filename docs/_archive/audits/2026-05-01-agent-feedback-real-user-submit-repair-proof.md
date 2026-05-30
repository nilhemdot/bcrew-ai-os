# Agent Feedback Real-User Submit Repair Proof

Card: `AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001`
Closeout key: `agent-feedback-real-user-submit-repair-v1`
Date: 2026-05-01

## Result

Accepted for the repaired real-user test only. Steve submitted through the real browser link from the newest manual-user email. Production auto-send remains disabled and was not built or enabled.

```json
{
  "status": "healthy",
  "phase": "real_user_submitted",
  "target": "Steve Zahnd",
  "milestoneDay": 30,
  "freshSendAttempt": {
    "status": "clickup_requested",
    "tokenHashPrefix": "5601f44bccdcd8a3",
    "gmailMessageIdPresent": true,
    "gmailThreadIdPresent": true,
    "manualUserSubmit": true,
    "syntheticSubmitLiveToken": false,
    "previousScriptConsumedEvidence": true
  },
  "realBrowserResponse": {
    "exists": true,
    "responseIdHash": "bc532858313514fd",
    "tokenHashPrefix": "5601f44bccdcd8a3",
    "milestoneDay": 30,
    "score": 8,
    "submittedAt": "2026-05-01T13:02:38.374Z",
    "browserUserAgentPresent": true,
    "scriptSubmission": false,
    "supersededByRepair": false,
    "feedbackTextLogged": false
  },
  "clickUpWriteback": {
    "status": "succeeded",
    "completedScoreFeedbackWritten": true,
    "feedbackTextLogged": false
  },
  "internalNotification": {
    "status": "sent",
    "recipientRoles": ["Steve", "Carson", "Ryan", "Georgia"],
    "gmailMessageIdPresent": true,
    "gmailThreadIdPresent": true,
    "rawEmailsLogged": false,
    "feedbackContentLogged": false
  },
  "reminderReadiness": {
    "stopped": true,
    "reason": "feedback_completed"
  },
  "duplicateProtection": {
    "duplicateSubmitClearMessage": true,
    "duplicateSubmitMessage": "This feedback link has already been submitted.",
    "duplicateResendBlockedBeforeSideEffects": true
  },
  "bccProof": {
    "rolesApplied": ["Steve", "Carson", "Ryan", "Georgia"],
    "actualSendRoles": ["Carson", "Ryan", "Georgia"],
    "dedupedRoles": ["Steve"],
    "gmailMetadataFetched": true,
    "bccHeaderPresent": true,
    "rawEmailsLogged": false
  },
  "previousRun": {
    "scriptConsumedEvidencePreserved": true,
    "supersededSendAttempts": 1,
    "supersededScriptResponses": 1,
    "scoreFeedbackReset": false
  },
  "boundaries": {
    "productionAutoSendEnabled": false,
    "georgiaTargeted": false,
    "otherRosterSends": false,
    "syntheticSubmitLiveToken": false,
    "rawEmailLogged": false,
    "rawTokenLogged": false,
    "feedbackContentLogged": false
  }
}
```

## Checks

- `process:agent-feedback-real-user-submit-repair-check -- --includeDuplicateProbe`
- `process:agent-feedback-steve-full-loop-test-check`
- `process:agent-feedback-company-email-policy-check`
- `backlog:hygiene -- --json`
- `process:ship-check -- --card=AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001 --planApprovalRef=docs/process/approvals/AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001.json --closeoutKey=agent-feedback-real-user-submit-repair-v1`
- `process:fanout-check -- --card=AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001 --closeoutKey=agent-feedback-real-user-submit-repair-v1`

## Boundary

The closeout owns only `AGENT-FEEDBACK-REAL-USER-SUBMIT-REPAIR-001`. The old Steve full-loop proof remains not accepted failure evidence. Production auto-send, Georgia-as-target send, other roster sends, live reminders, gate-speed work, raw email addresses, private token URLs, raw tokens, and feedback text are out of scope.

Duplicate submit proof: a second POST against the newest manual-user token returned the clear already-submitted message without saving another response.
