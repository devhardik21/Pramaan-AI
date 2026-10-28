import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Building2, RefreshCw, Search, ShieldCheck, AlertTriangle,
  FileText, CheckCircle, Clock, XCircle, ChevronRight,
  MapPin, Phone, Mail, TrendingUp, Eye
} from "lucide-react";
import { adminAPI, applicationsAPI } from "../api/endpoints";
import { formatDate, STATUS_LABELS, STATUS_CLASSES } from "../components/statusHelpers";

const getComplianceColor = (score) => {
  if (score >= 85) return { bg: "bg-emerald-100", text: "text-emerald-700", bar: "bg-emerald-500" };
  if (score >= 60) return { bg: "bg-amber-100", text: "text-amber-700", bar: "bg-amber-500" };
  return { bg: "bg-red-100", text: "text-red-700", bar: "bg-red-500" };
};

export default function AdminInstitutionsPage() {
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [selectedApps, setSelectedApps] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);

  const fetchInstitutions = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminAPI.listInstitutions();
      setInstitutions(res.data.data || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to load institutions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInstitutions(); }, []);

  const fetchInstitutionApps = async (inst) => {
    setSelected(inst);
    setLoadingApps(true);
    try {
      const res = await applicationsAPI.list({ limit: 20 });
      const apps = (res.data.data || []).filter(
        (a) => a.institution?._id === inst._id || a.institution === inst._id
      );
      setSelectedApps(apps);
    } catch (err) {
      console.error(err);
      setSelectedApps([]);
    } finally {
      setLoadingApps(false);
    }
  };

  const filtered = institutions.filter((i) => {
    const q = search.toLowerCase();
    return (
      i.name?.toLowerCase().includes(q) ||
      i.aicteId?.toLowerCase().includes(q) ||
      i.address?.city?.toLowerCase().includes(q) ||
      i.address?.state?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="text-primary" size={26} />
            Institution Overview
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            All registered institutions · Document submissions · Compliance status
          </p>
        </div>
        <button onClick={fetchInstitutions} disabled={loading} className="btn btn-secondary text-xs py-2 self-start sm:self-auto">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Summary Metrics */}
      {!loading && !error && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4 border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Institutions</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{institutions.length}</h3>
          </div>
          <div className="card p-4 border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Applications</p>
            <h3 className="text-2xl font-bold text-blue-600 mt-1">{institutions.reduce((a, i) => a + i.totalApplications, 0)}</h3>
          </div>
          <div className="card p-4 border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Documents</p>
            <h3 className="text-2xl font-bold text-violet-600 mt-1">{institutions.reduce((a, i) => a + i.documentCount, 0)}</h3>
          </div>
          <div className="card p-4 border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Open Findings</p>
            <h3 className="text-2xl font-bold text-red-600 mt-1">{institutions.reduce((a, i) => a + i.openFindings, 0)}</h3>
          </div>
        </div>
      )}

      <div className="flex gap-5">
        {/* Institution List Panel */}
        <div className="flex-1 min-w-0">
          {/* Search */}
          <div className="card p-3 border border-slate-200 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Search by institution name, AICTE ID, city or state..."
                className="form-input pl-9 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm mb-4">{error}</div>}

          {/* Institution Cards */}
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-primary" />
              Loading institutions...
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((inst) => {
                const scoreInfo = getComplianceColor(inst.complianceScore);
                const isSelected = selected?._id === inst._id;
                return (
                  <div
                    key={inst._id}
                    onClick={() => fetchInstitutionApps(inst)}
                    className={`card p-4 border-2 cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? "border-primary shadow-md" : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Building2 size={20} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm leading-tight">{inst.name}</h3>
                            <p className="text-[11px] font-mono text-slate-400 mt-0.5">AICTE ID: {inst.aicteId || "N/A"}</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${scoreInfo.bg} ${scoreInfo.text}`}>
                              {inst.complianceScore}% compliant
                            </span>
                          </div>
                        </div>

                        {(inst.address?.city || inst.address?.state) && (
                          <div className="flex items-center gap-1 mt-1.5 text-slate-500">
                            <MapPin size={11} />
                            <span className="text-[11px]">{[inst.address.city, inst.address.state].filter(Boolean).join(", ")}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-4 mt-2.5">
                          <div className="flex items-center gap-1 text-slate-500">
                            <FileText size={13} />
                            <span className="text-xs font-medium">{inst.totalApplications} app{inst.totalApplications !== 1 ? "s" : ""}</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-500">
                            <Eye size={13} />
                            <span className="text-xs font-medium">{inst.documentCount} docs</span>
                          </div>
                          {inst.openFindings > 0 && (
                            <div className="flex items-center gap-1 text-red-500">
                              <AlertTriangle size={13} />
                              <span className="text-xs font-medium">{inst.openFindings} findings</span>
                            </div>
                          )}
                          {inst.isVerified && (
                            <div className="flex items-center gap-1 text-emerald-600">
                              <ShieldCheck size={13} />
                              <span className="text-[11px] font-medium">Verified</span>
                            </div>
                          )}
                        </div>

                        {/* Status distribution pills */}
                        {inst.statusCounts && Object.keys(inst.statusCounts).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {Object.entries(inst.statusCounts).map(([status, count]) => (
                              <span key={status} className={`badge ${STATUS_CLASSES[status] || "badge-neutral"} text-[10px]`}>
                                {STATUS_LABELS[status] || status}: {count}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <ChevronRight size={16} className={`flex-shrink-0 transition-colors mt-1 ${isSelected ? "text-primary" : "text-slate-300"}`} />
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && !loading && (
                <div className="py-12 text-center">
                  <Building2 size={40} className="mx-auto text-slate-300 mb-3" />
                  <h4 className="text-sm font-semibold text-slate-600">No Institutions Found</h4>
                  <p className="text-xs text-slate-400 mt-1">Try a different search query.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="w-80 flex-shrink-0">
            <div className="card border border-slate-200 overflow-hidden sticky top-4">
              {/* Institution header */}
              <div className="bg-gradient-to-br from-navy-900 to-primary p-5 text-white">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-3">
                  <Building2 size={20} />
                </div>
                <h3 className="font-bold text-sm leading-tight">{selected.name}</h3>
                <p className="text-navy-300 text-[11px] mt-1 font-mono">{selected.aicteId}</p>
                {selected.address && (
                  <div className="flex items-center gap-1 mt-2 text-navy-300">
                    <MapPin size={11} />
                    <span className="text-[11px]">{[selected.address.city, selected.address.state, selected.address.pincode].filter(Boolean).join(", ")}</span>
                  </div>
                )}
                {selected.contactEmail && (
                  <div className="flex items-center gap-1 mt-1 text-navy-300">
                    <Mail size={11} />
                    <span className="text-[11px]">{selected.contactEmail}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                <div className="p-3 text-center">
                  <p className="text-lg font-bold text-slate-900">{selected.totalApplications}</p>
                  <p className="text-[10px] text-slate-400">Applications</p>
                </div>
                <div className="p-3 text-center">
                  <p className="text-lg font-bold text-violet-600">{selected.documentCount}</p>
                  <p className="text-[10px] text-slate-400">Documents</p>
                </div>
                <div className="p-3 text-center">
                  <p className={`text-lg font-bold ${selected.openFindings > 0 ? "text-red-500" : "text-emerald-600"}`}>{selected.openFindings}</p>
                  <p className="text-[10px] text-slate-400">Open Findings</p>
                </div>
              </div>

              {/* Applications list */}
              <div className="p-4">
                <h4 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">Applications</h4>
                {loadingApps ? (
                  <div className="py-6 text-center">
                    <RefreshCw size={18} className="animate-spin mx-auto text-primary" />
                  </div>
                ) : selectedApps.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-4">No applications found</p>
                ) : (
                  <div className="space-y-2">
                    {selectedApps.slice(0, 5).map((app) => (
                      <Link
                        key={app._id}
                        to={`/applications/${app._id}`}
                        className="block p-2.5 rounded-lg border border-slate-100 hover:border-primary hover:bg-primary/5 transition-all"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-800">
                            {app.applicationNumber || app._id.substring(0, 8)}
                          </span>
                          <span className={`badge ${STATUS_CLASSES[app.status] || "badge-neutral"} text-[10px]`}>
                            {STATUS_LABELS[app.status] || app.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 capitalize">
                          {app.applicationType?.replace(/_/g, " ")} · {app.academicYear}
                        </p>
                        <p className="text-[10px] text-slate-400">{formatDate(app.createdAt)}</p>
                      </Link>
                    ))}
                    {selectedApps.length > 5 && (
                      <Link to="/applications" className="block text-center text-xs text-primary font-medium hover:underline mt-2">
                        View all {selectedApps.length} applications →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
