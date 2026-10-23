import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderOpen, PlusCircle, Search, Filter,
  RefreshCw, ChevronRight, AlertTriangle, CheckCircle,
  FileText, ExternalLink
} from 'lucide-react';
import { applicationsAPI } from '../api/endpoints';
import { useAuth } from '../contexts/AuthContext';
import {
  STATUS_LABELS, STATUS_CLASSES,
  formatDate
} from '../components/statusHelpers';

const APPLICATION_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'new_institution', label: 'New Institution' },
  { value: 'extension_of_approval', label: 'Extension of Approval (EoA)' },
  { value: 'increase_in_intake', label: 'Increase in Intake' },
  { value: 'introduction_of_new_course', label: 'New Course Introduction' },
  { value: 'closure_of_course', label: 'Course Closure' },
];

const STATUS_FILTERS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'rectification_requested', label: 'Rectification Requested' },
  { value: 'rectification_submitted', label: 'Rectification Submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

export default function ApplicationsListPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;
      if (search) params.search = search;

      const res = await applicationsAPI.list(params);
      setApplications(res.data.data?.applications || res.data.applications || res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch applications', err);
      setError(err.response?.data?.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [typeFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchApplications();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Applications</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage, evaluate, and track AICTE institutional approval submissions.
          </p>
        </div>
        {['institution_user', 'admin'].includes(user?.role) && (
          <Link to="/applications/new" className="btn btn-primary text-xs py-2 self-start sm:self-auto">
            <PlusCircle size={15} />
            New Application
          </Link>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 border border-slate-200">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search by application number or institution..."
              className="form-input pl-9 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="form-select text-xs min-w-[160px]"
            >
              {APPLICATION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-select text-xs min-w-[150px]"
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            <button type="submit" className="btn btn-secondary text-xs px-3 py-2">
              Filter
            </button>
            <button
              type="button"
              onClick={() => { setSearch(''); setTypeFilter(''); setStatusFilter(''); }}
              className="btn btn-ghost text-xs px-3 py-2 text-slate-500"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Applications Table */}
      <div className="card p-0 border border-slate-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-primary" />
            Loading applications list...
          </div>
        ) : applications.length === 0 ? (
          <div className="py-16 text-center px-4">
            <FolderOpen size={44} className="mx-auto text-slate-300 mb-3" />
            <h3 className="text-base font-semibold text-slate-700">No Applications Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {search || typeFilter || statusFilter
                ? 'No applications match your active filter criteria. Try clearing filters.'
                : 'Get started by creating your first institutional application to upload documents and run compliance checks.'}
            </p>
            {['institution_user', 'admin'].includes(user?.role) && (
              <Link to="/applications/new" className="btn btn-primary text-xs mt-4 inline-flex items-center gap-1.5">
                <PlusCircle size={14} /> Create Application
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-100">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Application No</th>
                  <th className="py-3 px-4">Institution Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Academic Year</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Documents</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {applications.map((app) => (
                  <tr key={app._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-primary">
                      <Link to={`/applications/${app._id}`} className="hover:underline">
                        {app.applicationNumber || app._id.substring(0, 8)}
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {app.institutionId?.name || app.institutionDetails?.name || 'Institutional Submission'}
                    </td>
                    <td className="py-3 px-4 capitalize text-slate-600">
                      {app.applicationType?.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {app.academicYear || '2026-2027'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${STATUS_CLASSES[app.status] || 'badge-neutral'}`}>
                        {STATUS_LABELS[app.status] || app.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-700">
                        {app.documentsCount ?? app.documents?.length ?? 0}
                      </span>
                      <span className="text-slate-400"> attached</span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {formatDate(app.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/applications/${app._id}`}
                        className="btn btn-secondary btn-sm text-[11px] py-1 px-2.5 inline-flex items-center gap-1"
                      >
                        Open <ChevronRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
