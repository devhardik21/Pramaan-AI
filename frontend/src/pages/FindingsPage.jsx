import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, Filter, Search, RefreshCw, CheckCircle,
  ExternalLink, ArrowRight, ShieldAlert, Check
} from 'lucide-react';
import api from '../api/axios';
import {
  SEVERITY_CLASSES, FINDING_STATUS_CLASSES,
  FINDING_TYPE_LABELS, formatDate
} from '../components/statusHelpers';

export default function FindingsPage() {
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchFindings = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (severityFilter) params.severity = severityFilter;
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;

      const res = await api.get('/applications/findings/all', { params });
      setFindings(res.data.data?.findings || res.data.findings || res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch findings', err);
      // Fallback: If endpoint not implemented as global, show graceful state
      setError(err.response?.data?.message || 'Failed to load global compliance findings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFindings();
  }, [severityFilter, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compliance Findings</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Cross-application discrepancy monitor, checklist breaches, and extraction warnings.
          </p>
        </div>
        <button
          onClick={fetchFindings}
          disabled={loading}
          className="btn btn-secondary text-xs py-2 self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Findings
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 border border-slate-200">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search findings by title, description, or rule..."
              className="form-input pl-9 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchFindings()}
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-3">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="form-select text-xs min-w-[140px]"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="major">Major</option>
              <option value="minor">Minor</option>
              <option value="info">Informational</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-select text-xs min-w-[140px]"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
              <option value="manual_review_required">Manual Review</option>
              <option value="acknowledged">Acknowledged</option>
            </select>

            <button
              onClick={() => { setSearch(''); setSeverityFilter(''); setStatusFilter(''); }}
              className="btn btn-ghost text-xs px-3 py-2 text-slate-500"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
          {error}
        </div>
      )}

      {/* Findings List */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-primary" />
          Loading findings...
        </div>
      ) : findings.length === 0 ? (
        <div className="card p-16 text-center border border-slate-200">
          <CheckCircle size={44} className="mx-auto text-emerald-500 mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No Discrepancies Recorded</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {severityFilter || statusFilter || search
              ? 'No findings matched your active filter settings.'
              : 'All evaluated applications are currently free of flagged compliance issues.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {findings.map((finding) => (
            <div
              key={finding._id}
              className={`card p-5 border transition-all ${
                finding.severity === 'critical'
                  ? 'border-red-200 bg-red-50/20'
                  : finding.severity === 'major'
                  ? 'border-amber-200 bg-amber-50/20'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 p-2 rounded-lg flex-shrink-0 ${
                    finding.severity === 'critical'
                      ? 'bg-red-100 text-red-700'
                      : finding.severity === 'major'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900">{finding.checkName || finding.title || 'Regulatory Finding'}</h3>
                      <span className={`badge ${SEVERITY_CLASSES[finding.severity] || 'badge-neutral'} uppercase text-[10px]`}>
                        {finding.severity}
                      </span>
                      <span className={`badge ${FINDING_STATUS_CLASSES[finding.status] || 'badge-neutral'} text-[10px]`}>
                        {finding.status}
                      </span>
                      {finding.ruleId && (
                        <span className="badge badge-neutral text-[10px] font-mono">
                          {typeof finding.ruleId === 'object' ? finding.ruleId.name || finding.ruleId.ruleId : finding.ruleId}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">
                      {finding.explanation || finding.description}
                    </p>

                    {/* Evidence & Comparison Box */}
                    {(finding.observedValue || finding.expectedValue) && (
                      <div className="mt-2.5 p-2.5 rounded-lg bg-white/90 border border-slate-200 text-xs space-y-1">
                        {finding.observedValue && (
                          <div className="flex items-start gap-1.5">
                            <span className="font-semibold text-slate-600 flex-shrink-0">Observed Evidence:</span>
                            <span className="font-mono text-red-600 break-all">{typeof finding.observedValue === 'object' ? JSON.stringify(finding.observedValue) : String(finding.observedValue)}</span>
                          </div>
                        )}
                        {finding.expectedValue && (
                          <div className="flex items-start gap-1.5">
                            <span className="font-semibold text-slate-600 flex-shrink-0">AICTE Regulatory Standard:</span>
                            <span className="font-mono text-emerald-700">{typeof finding.expectedValue === 'object' ? JSON.stringify(finding.expectedValue) : String(finding.expectedValue)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-slate-500">
                      {(finding.application || finding.applicationId) && (
                        <span>
                          <span className="font-semibold text-slate-700">Application: </span>
                          <Link
                            to={`/applications/${(finding.application?._id || finding.applicationId?._id || finding.application || finding.applicationId)}`}
                            className="text-primary hover:underline font-mono"
                          >
                            {finding.application?.applicationNumber || finding.applicationId?.applicationNumber || 'View Dossier'}
                          </Link>
                          {finding.application?.institution?.name && (
                            <span className="text-slate-400 ml-1">({finding.application.institution.name})</span>
                          )}
                        </span>
                      )}
                      {finding.document && (
                        <span>
                          <span className="font-semibold text-slate-700">Document: </span>
                          {finding.document.originalFilename || 'Document'}
                        </span>
                      )}
                      {finding.findingType && (
                        <span>
                          <span className="font-semibold text-slate-700">Type: </span>
                          {FINDING_TYPE_LABELS[finding.findingType] || finding.findingType}
                        </span>
                      )}
                      <span>
                        <span className="font-semibold text-slate-700">Logged: </span>
                        {formatDate(finding.createdAt)}
                      </span>
                    </div>

                    {finding.suggestedAction && (
                      <div className="mt-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700">
                        <span className="font-semibold text-primary">Required Rectification: </span>
                        {finding.suggestedAction}
                      </div>
                    )}
                  </div>
                </div>

                {(finding.application || finding.applicationId) && (
                  <Link
                    to={`/applications/${(finding.application?._id || finding.applicationId?._id || finding.application || finding.applicationId)}`}
                    className="btn btn-secondary btn-sm text-[11px] py-1.5 px-3 self-start inline-flex items-center gap-1"
                  >
                    Open Dossier <ExternalLink size={12} />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
