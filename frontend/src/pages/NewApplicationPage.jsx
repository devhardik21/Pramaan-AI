import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2, BookOpen, User, MapPin, CheckCircle,
  AlertCircle, ArrowLeft, Send, ShieldAlert
} from 'lucide-react';
import { applicationsAPI } from '../api/endpoints';

const PROGRAMMES = [
  'Engineering & Technology',
  'Management (MBA/PGDM)',
  'Computer Applications (MCA)',
  'Pharmacy',
  'Architecture & Town Planning',
  'Applied Arts & Crafts',
  'Hotel Management & Catering Technology'
];

export default function NewApplicationPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    applicationType: 'extension_of_approval',
    academicYear: '2026-2027',
    institutionDetails: {
      name: '',
      aictePermanentId: '',
      institutionType: 'private_unaided',
      state: '',
      district: '',
      address: '',
      pinCode: '',
      website: '',
    },
    contactPerson: {
      name: '',
      designation: 'Principal / Director',
      email: '',
      phone: '',
    },
    programmes: ['Engineering & Technology'],
    declarationAccepted: false,
  });

  const handleInputChange = (section, field, value) => {
    if (section) {
      setFormData((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleProgrammeToggle = (prog) => {
    setFormData((prev) => {
      const exists = prev.programmes.includes(prog);
      return {
        ...prev,
        programmes: exists
          ? prev.programmes.filter((p) => p !== prog)
          : [...prev.programmes, prog],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.institutionDetails.name.trim()) {
      setError('Please provide the official institution name.');
      return;
    }
    if (!formData.declarationAccepted) {
      setError('Please confirm the institutional declaration before proceeding.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        applicationType: formData.applicationType,
        academicYear: formData.academicYear,
        institutionDetails: formData.institutionDetails,
        contactPerson: formData.contactPerson,
        programmes: formData.programmes,
      };

      const res = await applicationsAPI.create(payload);
      const newId = res.data?.data?._id || res.data?._id;
      if (newId) {
        navigate(`/applications/${newId}`);
      } else {
        navigate('/applications');
      }
    } catch (err) {
      console.error('Failed to create application', err);
      setError(err.response?.data?.message || 'Failed to create application. Check backend validation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/applications" className="btn btn-secondary btn-sm p-2">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">New AICTE Application</h1>
            <p className="text-xs text-slate-500">Initiate approval submission for institutional review</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2 text-sm">
          <AlertCircle size={18} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Submission Type */}
        <div className="card p-6 border border-slate-200 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <BookOpen size={16} className="text-primary" /> Application Category & Year
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Application Type *</label>
              <select
                className="form-select text-xs"
                value={formData.applicationType}
                onChange={(e) => handleInputChange(null, 'applicationType', e.target.value)}
              >
                <option value="extension_of_approval">Extension of Approval (EoA)</option>
                <option value="new_institution">Establishment of New Institution</option>
                <option value="increase_in_intake">Increase in Intake / Additional Course</option>
                <option value="introduction_of_new_course">Introduction of New Course / Division</option>
                <option value="closure_of_course">Closure of Course / Institution</option>
              </select>
            </div>

            <div>
              <label className="form-label">Academic Year *</label>
              <select
                className="form-select text-xs"
                value={formData.academicYear}
                onChange={(e) => handleInputChange(null, 'academicYear', e.target.value)}
              >
                <option value="2026-2027">2026-2027</option>
                <option value="2025-2026">2025-2026</option>
              </select>
            </div>
          </div>
        </div>

        {/* Step 2: Institution Details */}
        <div className="card p-6 border border-slate-200 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Building2 size={16} className="text-primary" /> Institution Identification
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="form-label">Institution Legal Name *</label>
              <input
                type="text"
                required
                placeholder="e.g., National Institute of Engineering & Technology"
                className="form-input text-xs"
                value={formData.institutionDetails.name}
                onChange={(e) => handleInputChange('institutionDetails', 'name', e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">AICTE Permanent ID (if assigned)</label>
              <input
                type="text"
                placeholder="e.g., 1-1234567890"
                className="form-input text-xs"
                value={formData.institutionDetails.aictePermanentId}
                onChange={(e) => handleInputChange('institutionDetails', 'aictePermanentId', e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Institution Category</label>
              <select
                className="form-select text-xs"
                value={formData.institutionDetails.institutionType}
                onChange={(e) => handleInputChange('institutionDetails', 'institutionType', e.target.value)}
              >
                <option value="government">Government</option>
                <option value="govt_aided">Government Aided</option>
                <option value="private_unaided">Private-Unaided</option>
                <option value="deemed_university">Deemed to be University</option>
                <option value="central_university">Central University</option>
              </select>
            </div>

            <div>
              <label className="form-label">State / UT *</label>
              <input
                type="text"
                placeholder="e.g., Maharashtra"
                className="form-input text-xs"
                value={formData.institutionDetails.state}
                onChange={(e) => handleInputChange('institutionDetails', 'state', e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">District *</label>
              <input
                type="text"
                placeholder="e.g., Pune"
                className="form-input text-xs"
                value={formData.institutionDetails.district}
                onChange={(e) => handleInputChange('institutionDetails', 'district', e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="form-label">Campus Address</label>
              <input
                type="text"
                placeholder="Plot / Survey No., Street, Campus location"
                className="form-input text-xs"
                value={formData.institutionDetails.address}
                onChange={(e) => handleInputChange('institutionDetails', 'address', e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">PIN Code</label>
              <input
                type="text"
                placeholder="e.g., 411001"
                className="form-input text-xs"
                value={formData.institutionDetails.pinCode}
                onChange={(e) => handleInputChange('institutionDetails', 'pinCode', e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Official Website</label>
              <input
                type="url"
                placeholder="https://www.institution.edu.in"
                className="form-input text-xs"
                value={formData.institutionDetails.website}
                onChange={(e) => handleInputChange('institutionDetails', 'website', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Step 3: Programmes Applied For */}
        <div className="card p-6 border border-slate-200 space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <BookOpen size={16} className="text-primary" /> Programmes Under Approval
          </h2>
          <p className="text-xs text-slate-500">Select all disciplines associated with this approval application:</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            {PROGRAMMES.map((prog) => {
              const checked = formData.programmes.includes(prog);
              return (
                <label
                  key={prog}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition ${
                    checked
                      ? 'border-primary/40 bg-primary/5 text-primary-dark font-medium'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleProgrammeToggle(prog)}
                    className="rounded text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>{prog}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Step 4: Contact / Officer */}
        <div className="card p-6 border border-slate-200 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <User size={16} className="text-primary" /> Head of Institution / Authorized Liaison
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Officer / Principal Name</label>
              <input
                type="text"
                placeholder="Dr. Full Name"
                className="form-input text-xs"
                value={formData.contactPerson.name}
                onChange={(e) => handleInputChange('contactPerson', 'name', e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Designation</label>
              <input
                type="text"
                className="form-input text-xs"
                value={formData.contactPerson.designation}
                onChange={(e) => handleInputChange('contactPerson', 'designation', e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Official Email</label>
              <input
                type="email"
                placeholder="principal@institution.edu.in"
                className="form-input text-xs"
                value={formData.contactPerson.email}
                onChange={(e) => handleInputChange('contactPerson', 'email', e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">Mobile Contact</label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                className="form-input text-xs"
                value={formData.contactPerson.phone}
                onChange={(e) => handleInputChange('contactPerson', 'phone', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Declaration & Submission */}
        <div className="card p-6 border border-slate-200 space-y-4 bg-slate-50/70">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              required
              checked={formData.declarationAccepted}
              onChange={(e) => setFormData((p) => ({ ...p, declarationAccepted: e.target.checked }))}
              className="mt-0.5 rounded text-primary focus:ring-primary h-4 w-4"
            />
            <span className="text-xs text-slate-700 leading-relaxed">
              I hereby declare that the preliminary information provided above is true and authentic.
              I understand that uploading documents will trigger automated OCR text extraction, regulatory
              consistency checks against the AICTE Approval Process Handbook, and tamper-evident audit logging.
            </span>
          </label>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <Link to="/applications" className="btn btn-secondary text-xs">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary text-xs"
            >
              {submitting ? (
                <>Creating Application...</>
              ) : (
                <>
                  <Send size={14} /> Create Application & Proceed to Uploads
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
