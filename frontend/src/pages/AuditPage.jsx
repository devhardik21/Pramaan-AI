import { useState, useEffect } from 'react';
import {
  History, Search, Filter, RefreshCw, ShieldCheck,
  Calendar, User, Lock, ExternalLink
} from 'lucide-react';
import api from '../api/axios';
import { formatDateTime } from '../components/statusHelpers';

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = {};
      if (actionFilter) params.action = actionFilter;
      if (search) params.search = search;

      const res = await api.get('/admin/audit', { params });
      setLogs(res.data.data?.logs || res.data.logs || res.data.data || []);
    } catch (err) {
      console.error('Failed to load audit trail', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <History className="text-primary" size={26} />
            Cryptographic Audit Log
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Tamper-evident system activity log capturing every document upload, OCR extraction override, and evaluation state shift.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="btn btn-secondary text-xs py-2 self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Log
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 border border-slate-200">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search audit trail by actor, entity ID, or keyword..."
              className="form-input pl-9 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="form-select text-xs min-w-[160px]"
          >
            <option value="">All Actions</option>
            <option value="create_application">Create Application</option>
            <option value="upload_document">Upload Document</option>
            <option value="correct_field">Correct Field</option>
            <option value="run_validation">Run Validation</option>
            <option value="update_status">Update Status</option>
            <option value="request_rectification">Request Rectification</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card p-0 border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-primary" />
            Loading audit records...
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center px-4">
            <Lock size={40} className="mx-auto text-slate-300 mb-3" />
            <h3 className="text-base font-semibold text-slate-700">No Audit Events Recorded</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Audit records are written automatically whenever users create, upload, or evaluate documents.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-100">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Entity</th>
                  <th className="py-3 px-4">Details / Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {formatDateTime(log.createdAt || log.timestamp)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 capitalize">
                      {log.action?.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{log.userId?.name || log.actorName || 'System'}</div>
                      <div className="text-[10px] text-slate-400 capitalize">{log.userId?.role || log.actorRole || 'Engine'}</div>
                    </td>
                    <td className="py-3 px-4 capitalize text-slate-600">
                      {log.entityType?.replace(/_/g, ' ')} ({log.entityId ? String(log.entityId).substring(0, 8) : '—'})
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 max-w-sm truncate">
                      {log.details ? JSON.stringify(log.details) : '—'}
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
