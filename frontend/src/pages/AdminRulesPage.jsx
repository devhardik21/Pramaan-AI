import { useState, useEffect } from 'react';
import {
  Settings, Plus, Edit2, ShieldAlert, CheckCircle,
  AlertTriangle, RefreshCw, X, Sliders
} from 'lucide-react';
import { adminAPI } from '../api/endpoints';
import { SEVERITY_CLASSES } from '../components/statusHelpers';

export default function AdminRulesPage() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'land_norms',
    severity: 'critical',
    description: '',
    isActive: true,
  });

  const fetchRules = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.listRules();
      setRules(res.data.data?.rules || res.data.rules || res.data.data || []);
    } catch (err) {
      console.error('Failed to load rules', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleOpenCreate = () => {
    setEditingRule(null);
    setFormData({
      code: '',
      name: '',
      category: 'land_norms',
      severity: 'critical',
      description: '',
      isActive: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (rule) => {
    setEditingRule(rule);
    setFormData({
      code: rule.code || '',
      name: rule.name || '',
      category: rule.category || 'land_norms',
      severity: rule.severity || 'critical',
      description: rule.description || '',
      isActive: rule.isActive ?? true,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRule) {
        await adminAPI.updateRule(editingRule._id, formData);
      } else {
        await adminAPI.createRule(formData);
      }
      setModalOpen(false);
      fetchRules();
    } catch (err) {
      console.error('Failed to save rule', err);
      alert(err.response?.data?.message || 'Failed to save rule');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="text-primary" size={26} />
            Rule Engine & Norms Configuration
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure validation rules, severity levels, and automated discrepancy thresholds applied during scrutiny.
          </p>
        </div>
        <button onClick={handleOpenCreate} className="btn btn-primary text-xs py-2 self-start sm:self-auto">
          <Plus size={14} /> Add Validation Rule
        </button>
      </div>

      {/* Rules Table */}
      <div className="card p-0 border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-primary" />
            Loading compliance rules...
          </div>
        ) : rules.length === 0 ? (
          <div className="py-16 text-center px-4">
            <Settings size={40} className="mx-auto text-slate-300 mb-3" />
            <h3 className="text-base font-semibold text-slate-700">No Custom Rules Defined</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Default built-in AICTE handbook compliance checks are active in the core engine. You can add custom state or programme-specific rules above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-100">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Rule Code</th>
                  <th className="py-3 px-4">Rule Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rules.map((rule) => (
                  <tr key={rule._id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {rule.code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{rule.name}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-1">{rule.description}</div>
                    </td>
                    <td className="py-3 px-4 capitalize text-slate-600">
                      {rule.category?.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${SEVERITY_CLASSES[rule.severity] || 'badge-neutral'} uppercase text-[10px]`}>
                        {rule.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${rule.isActive ? 'badge-success' : 'badge-neutral'} text-[10px]`}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(rule)}
                        className="btn btn-secondary btn-sm text-[11px] py-1 px-2.5 inline-flex items-center gap-1"
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingRule ? 'Edit Compliance Rule' : 'New Compliance Rule'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="form-label">Rule Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AICTE_LAND_001"
                  className="form-input text-xs font-mono uppercase"
                  value={formData.code}
                  onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                />
              </div>

              <div>
                <label className="form-label">Rule Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Minimum Land Area Sufficiency"
                  className="form-input text-xs"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Category</label>
                  <select
                    className="form-select text-xs"
                    value={formData.category}
                    onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
                  >
                    <option value="land_norms">Land Norms</option>
                    <option value="building_safety">Building & Safety</option>
                    <option value="faculty_cadre">Faculty & Cadre</option>
                    <option value="affidavit_legal">Affidavit & Legal</option>
                    <option value="infrastructure">Infrastructure</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Severity Level</label>
                  <select
                    className="form-select text-xs"
                    value={formData.severity}
                    onChange={(e) => setFormData((p) => ({ ...p, severity: e.target.value }))}
                  >
                    <option value="critical">Critical</option>
                    <option value="major">Major</option>
                    <option value="minor">Minor</option>
                    <option value="info">Informational</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">Description & Norm Rationale</label>
                <textarea
                  className="form-input text-xs h-20"
                  placeholder="Detail the AICTE handbook section and threshold calculation..."
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <span className="text-xs text-slate-700 font-medium">Rule Active in Validation Engine</span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary text-xs">
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
