import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText, AlertTriangle, ShieldCheck, Clock,
  ArrowRight, PlusCircle, CheckCircle, RefreshCw,
  FolderOpen, AlertCircle, Info, ExternalLink
} from 'lucide-react';
import { dashboardAPI } from '../api/endpoints';
import { useAuth } from '../contexts/AuthContext';
import {
  STATUS_LABELS, STATUS_CLASSES,
  SEVERITY_CLASSES, formatDate, formatDateTime
} from '../components/statusHelpers';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await dashboardAPI.summary();
      setData(res.data.data || res.data);
    } catch (err) {
      console.error('Failed to fetch dashboard summary', err);
      setError(err.response?.data?.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Advisory Banner */}
      <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg flex items-start gap-3 shadow-sm">
        <Info className="text-amber-600 mt-0.5 flex-shrink-0" size={20} />
        <div className="text-sm text-amber-900 leading-relaxed">
          <span className="font-semibold">Regulatory Decision Advisory: </span>
          Pramaan AI operates as an intelligent assistive verification system. All cross-document findings,
          confidence scores, and anomaly alerts are decision-support insights intended for scrutiny by authorized
          AICTE evaluators and institutional officers.
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {user?.name || 'Evaluator'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Role: <span className="font-medium text-slate-700 capitalize">{user?.role?.replace(/_/g, ' ')}</span> &bull; Overview of institutional compliance and pending evaluations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchSummary}
            className="btn btn-secondary text-xs py-2"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          {['institution_user', 'admin'].includes(user?.role) && (
            <Link to="/applications/new" className="btn btn-primary text-xs py-2">
              <PlusCircle size={15} />
              New Application
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="card p-5 border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Applications</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">
                {loading ? '—' : (data?.totalApplications ?? 0)}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FolderOpen size={20} />
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            {data?.applicationsByStatus?.submitted || 0} submitted &bull; {data?.applicationsByStatus?.under_review || 0} under review
          </div>
        </div>

        <div className="card p-5 border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Open Findings</p>
              <h3 className="text-2xl font-bold text-red-600 mt-1">
                {loading ? '—' : (data?.openFindings ?? 0)}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
            Critical: {data?.findingsBySeverity?.critical || 0} &bull; Major: {data?.findingsBySeverity?.major || 0}
          </div>
        </div>

        <div className="card p-5 border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Verification Pending</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">
                {loading ? '—' : (data?.verificationPending ?? 0)}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={20} />
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Awaiting issuer checks & QR parsing
          </div>
        </div>

        <div className="card p-5 border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approved / Verified</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                {loading ? '—' : (data?.applicationsByStatus?.approved ?? 0)}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Fully compliant institutional submissions
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Applications & Finding Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Applications (2 cols) */}
        <div className="lg:col-span-2 card p-5 border border-slate-200 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Applications</h2>
              <p className="text-xs text-slate-500">Submissions requiring evaluation or updates</p>
            </div>
            <Link to="/applications" className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-primary" />
              Loading applications...
            </div>
          ) : !data?.recentApplications?.length ? (
            <div className="py-12 text-center">
              <FolderOpen size={40} className="mx-auto text-slate-300 mb-3" />
              <h4 className="text-sm font-semibold text-slate-700">No Applications Yet</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No institutional applications have been created yet. Get started by creating your first submission.
              </p>
              {['institution_user', 'admin'].includes(user?.role) && (
                <Link to="/applications/new" className="btn btn-primary text-xs mt-4 inline-flex items-center gap-1.5">
                  <PlusCircle size={14} /> Create Application
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase">
                    <th className="pb-2">Application No</th>
                    <th className="pb-2">Institution</th>
                    <th className="pb-2">Type</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Created</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.recentApplications.map((app) => (
                    <tr key={app._id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="py-3 font-semibold text-slate-900">
                        <Link to={`/applications/${app._id}`} className="hover:text-primary">
                          {app.applicationNumber || app._id.substring(0, 8)}
                        </Link>
                      </td>
                      <td className="py-3 text-slate-700 font-medium">
                        {app.institutionId?.name || app.institutionDetails?.name || 'Institutional Submission'}
                      </td>
                      <td className="py-3 text-slate-500 capitalize">
                        {app.applicationType?.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3">
                        <span className={`badge ${STATUS_CLASSES[app.status] || 'badge-neutral'}`}>
                          {STATUS_LABELS[app.status] || app.status}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400">
                        {formatDate(app.createdAt)}
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          to={`/applications/${app._id}`}
                          className="btn btn-secondary btn-sm text-[11px] py-1 px-2.5 inline-flex items-center gap-1"
                        >
                          Details <ExternalLink size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Severity & Quick Actions (1 col) */}
        <div className="space-y-6">
          {/* Finding Severity Card */}
          <div className="card p-5 border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 mb-1">Findings Severity</h2>
            <p className="text-xs text-slate-500 mb-4">Breakdown of active compliance discrepancies</p>

            <div className="space-y-3">
              {[
                { label: 'Critical', count: data?.findingsBySeverity?.critical || 0, color: 'bg-red-500', bar: 'bg-red-100', text: 'text-red-700' },
                { label: 'Major', count: data?.findingsBySeverity?.major || 0, color: 'bg-amber-500', bar: 'bg-amber-100', text: 'text-amber-700' },
                { label: 'Minor', count: data?.findingsBySeverity?.minor || 0, color: 'bg-blue-500', bar: 'bg-blue-100', text: 'text-blue-700' },
                { label: 'Informational', count: data?.findingsBySeverity?.info || 0, color: 'bg-slate-400', bar: 'bg-slate-100', text: 'text-slate-700' },
              ].map((item) => (
                <div key={item.label} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700">{item.label}</span>
                    <span className={`font-bold ${item.text}`}>{item.count}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color}`}
                      style={{
                        width: `${Math.min(100, (item.count / Math.max(1, (data?.openFindings || 1))) * 100)}%`
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <Link to="/findings" className="text-xs text-primary font-medium hover:underline flex items-center justify-between">
                <span>View all compliance findings</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Assistant / RAG Quick Access */}
          <div className="card p-5 border border-slate-200 bg-gradient-to-br from-navy-900 to-primary-dark text-white">
            <h3 className="font-bold text-sm mb-1 flex items-center gap-1.5 text-white">
              <FileText size={16} className="text-accent" /> AICTE Regulatory Assistant
            </h3>
            <p className="text-xs text-navy-200 mb-4 leading-relaxed">
              Query AICTE Approval Process Handbook (APH) regulations with cited clauses, land requirements, and faculty-student ratios.
            </p>
            <Link
              to="/regulations"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-accent text-navy-900 text-xs font-bold rounded-lg hover:bg-yellow-400 transition"
            >
              Ask Handbook RAG <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
