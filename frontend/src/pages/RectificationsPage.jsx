import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeftRight, Clock, AlertTriangle, CheckCircle,
  ExternalLink, Search, RefreshCw, Calendar
} from 'lucide-react';
import api from '../api/axios';
import { formatDate } from '../components/statusHelpers';

export default function RectificationsPage() {
  const [rectifications, setRectifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRectifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/applications', { params: { status: 'rectification_requested' } });
      const apps = res.data.data?.applications || res.data.applications || res.data.data || [];

      // Extract rectification notices from applications
      const notices = [];
      apps.forEach((app) => {
        if (app.rectifications && app.rectifications.length > 0) {
          app.rectifications.forEach((r, idx) => {
            notices.push({
              ...r,
              applicationId: app._id,
              applicationNumber: app.applicationNumber,
              institutionName: app.institutionId?.name || app.institutionDetails?.name || 'Institution',
            });
          });
        }
      });
      setRectifications(notices);
    } catch (err) {
      console.error('Failed to load rectifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRectifications();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ArrowLeftRight className="text-primary" size={26} />
            Rectifications Workflow Queue
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track discrepancy cure notices issued to institutions, document rectifications, and adherence to AICTE deadlines.
          </p>
        </div>
        <button
          onClick={fetchRectifications}
          disabled={loading}
          className="btn btn-secondary text-xs py-2 self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Queue
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-primary" />
          Loading rectification notices...
        </div>
      ) : rectifications.length === 0 ? (
        <div className="card p-16 text-center border border-slate-200">
          <CheckCircle size={44} className="mx-auto text-emerald-500 mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No Pending Rectification Notices</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            There are currently no outstanding cure notices or deficiency submissions awaiting response.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rectifications.map((item, idx) => (
            <div key={idx} className="card p-5 border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{item.title || 'Rectification Notice'}</h3>
                  <p className="text-xs text-slate-500">
                    {item.institutionName} &bull; App No: <span className="font-mono text-primary">{item.applicationNumber}</span>
                  </p>
                </div>
                <span className="badge badge-warning text-[10px] capitalize self-start sm:self-auto">
                  {item.status || 'Pending Response'}
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">{item.details}</p>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Calendar size={13} /> Deadline: {formatDate(item.deadline)}
                  </span>
                  <span>Issued: {formatDate(item.createdAt)}</span>
                </div>

                <Link
                  to={`/applications/${item.applicationId}`}
                  className="btn btn-secondary btn-sm text-[11px] py-1 px-3 inline-flex items-center gap-1"
                >
                  Open Dossier <ExternalLink size={12} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
