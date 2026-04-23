const BROADCAST_TITLE_PATTERNS = [
  /\ball[- ]hands\b/i,
  /\btraining\b/i,
  /\bworkshop\b/i,
  /\bsession\b/i,
  /\bteam meeting\b/i,
  /\bhuddle\b/i,
  /\btwice the insights\b/i,
  /\bsales training\b/i,
  /\bmasterclass\b/i,
  /\bbootcamp\b/i,
];

const DISCUSSION_TITLE_PATTERNS = [
  /\bowners?\b/i,
  /\bleadership\b/i,
  /\b1[: ]1\b/i,
  /\bone on one\b/i,
  /\bexec(?:utive)?\b/i,
  /\breview\b/i,
  /\bplanning\b/i,
  /\bstrategy\b/i,
  /\baccountability\b/i,
  /\bcoaching\b/i,
];

const SENSITIVE_TITLE_PATTERNS = [
  /\btermination\b/i,
  /\bcomp(?:ensation)?\b/i,
  /\bpayroll\b/i,
  /\blegal\b/i,
  /\bdisciplin/i,
  /\bperformance review\b/i,
  /\bhr\b/i,
];

function normalizedTitle(title) {
  return String(title || '').trim();
}

export function classifyMeetingShape({
  title,
  observedAccounts = [],
  transcriptParticipants = [],
} = {}) {
  const normalized = normalizedTitle(title);
  const observedCount = Array.isArray(observedAccounts) ? observedAccounts.filter(Boolean).length : 0;
  const participantCount = Array.isArray(transcriptParticipants)
    ? transcriptParticipants.filter(Boolean).length
    : 0;
  const attendeeSignalCount = Math.max(observedCount, participantCount);

  const matchedSensitivePattern = SENSITIVE_TITLE_PATTERNS.find(pattern => pattern.test(normalized));
  if (matchedSensitivePattern) {
    return {
      meetingClass: 'discussion',
      privacyProfile: 'sensitive_discussion',
      attendeeSignalCount,
      sensitiveMeetingCandidate: true,
      classificationReason: 'Sensitive title pattern matched.',
    };
  }

  const matchedDiscussionPattern = DISCUSSION_TITLE_PATTERNS.find(pattern => pattern.test(normalized));
  if (matchedDiscussionPattern && attendeeSignalCount <= 8) {
    return {
      meetingClass: 'discussion',
      privacyProfile: 'subject_redaction',
      attendeeSignalCount,
      sensitiveMeetingCandidate: false,
      classificationReason: 'Discussion/review title pattern matched.',
    };
  }

  const matchedBroadcastPattern = BROADCAST_TITLE_PATTERNS.find(pattern => pattern.test(normalized));
  if (matchedBroadcastPattern || attendeeSignalCount >= 10) {
    return {
      meetingClass: 'broadcast',
      privacyProfile: 'baseline',
      attendeeSignalCount,
      sensitiveMeetingCandidate: false,
      classificationReason: matchedBroadcastPattern
        ? 'Broadcast/training title pattern matched.'
        : 'Attendee signal count indicates a broad-distribution meeting.',
    };
  }

  return {
    meetingClass: 'discussion',
    privacyProfile: 'subject_redaction',
    attendeeSignalCount,
    sensitiveMeetingCandidate: false,
    classificationReason: 'Defaulted to discussion/review for safer privacy handling.',
  };
}
