// Status/severity utilities shared across components

export const STATUS_LABELS = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  rectification_requested: 'Rectification Requested',
  rectification_submitted: 'Rectification Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export const STATUS_CLASSES = {
  draft: 'badge-neutral',
  submitted: 'badge-info',
  under_review: 'badge-navy',
  rectification_requested: 'badge-warning',
  rectification_submitted: 'badge-info',
  approved: 'badge-success',
  rejected: 'badge-danger',
  withdrawn: 'badge-neutral',
};

export const SEVERITY_CLASSES = {
  critical: 'badge-danger',
  major: 'badge-warning',
  minor: 'badge-info',
  info: 'badge-neutral',
};

export const FINDING_TYPE_LABELS = {
  missing: 'Missing',
  invalid: 'Invalid',
  expired: 'Expired',
  extraction_uncertain: 'Uncertain Extraction',
  mismatch: 'Mismatch',
  duplicate: 'Duplicate',
  anomaly: 'Anomaly',
  manual_review_required: 'Manual Review Required',
};

export const FINDING_STATUS_CLASSES = {
  open: 'badge-danger',
  resolved: 'badge-success',
  unresolved: 'badge-warning',
  manual_review_required: 'badge-warning',
  acknowledged: 'badge-neutral',
};

export const VERIFICATION_STATUS_CLASSES = {
  verified: 'badge-success',
  mismatch_detected: 'badge-danger',
  expired: 'badge-danger',
  verification_pending: 'badge-info',
  source_unavailable: 'badge-neutral',
  manual_review_required: 'badge-warning',
};

export const PROCESSING_STATUS_CLASSES = {
  pending: 'badge-neutral',
  processing: 'badge-info',
  completed: 'badge-success',
  failed: 'badge-danger',
  skipped: 'badge-neutral',
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

export const formatBytes = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const truncateHash = (hash, len = 12) =>
  hash ? `${hash.substring(0, len)}…` : '—';
