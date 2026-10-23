import { useState, useEffect } from 'react';
import {
  Users, Shield, CheckCircle, RefreshCw, UserCheck,
  Search, Lock, Mail, Building
} from 'lucide-react';
import { adminAPI } from '../api/endpoints';
import { formatDate } from '../components/statusHelpers';

const ROLES = [
  { value: 'admin', label: 'Admin (Full Privileges)' },
  { value: 'scrutiny_officer', label: 'Scrutiny Officer (Evaluation & Rectification)' },
  { value: 'evaluator', label: 'AICTE Evaluator (Inspection & Verification)' },
  { value: 'institution_user', label: 'Institution Representative (Upload & Submissions)' },
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [search, setSearch] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.listUsers();
      setUsers(res.data.data?.users || res.data.users || res.data.data || []);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId, newRole) => {
    try {
      setUpdatingId(userId);
      await adminAPI.updateUserRole(userId, newRole);
      fetchUsers();
    } catch (err) {
      console.error('Failed to update role', err);
      alert(err.response?.data?.message || 'Failed to update user role');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="text-primary" size={26} />
            User & Access Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Assign role-based access control (RBAC) tiers: Admin, Scrutiny Officer, Evaluator, and Institutional User.
          </p>
        </div>
        <button onClick={fetchUsers} disabled={loading} className="btn btn-secondary text-xs py-2 self-start sm:self-auto">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Users
        </button>
      </div>

      {/* Search */}
      <div className="card p-4 border border-slate-200">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search users by name, email, or role..."
            className="form-input pl-9 text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="card p-0 border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-primary" />
            Loading registered users...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center px-4">
            <Users size={40} className="mx-auto text-slate-300 mb-3" />
            <h3 className="text-base font-semibold text-slate-700">No Users Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No registered user accounts match your search.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-100">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Institution Link</th>
                  <th className="py-3 px-4">Registered Date</th>
                  <th className="py-3 px-4 text-right">Assign RBAC Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                          {u.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <span className="font-semibold text-slate-900">{u.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {u.email}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${
                        u.role === 'admin'
                          ? 'badge-danger'
                          : u.role === 'scrutiny_officer'
                          ? 'badge-navy'
                          : u.role === 'evaluator'
                          ? 'badge-info'
                          : 'badge-neutral'
                      } capitalize text-[10px]`}>
                        {u.role?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {u.institutionId?.name || u.institutionName || 'Global / AICTE'}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <select
                        disabled={updatingId === u._id}
                        value={u.role}
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        className="form-select text-[11px] py-1 px-2.5 bg-slate-50 border-slate-200"
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
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
