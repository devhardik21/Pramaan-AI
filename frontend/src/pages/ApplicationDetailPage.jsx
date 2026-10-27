import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FolderOpen, ArrowLeft, Upload, FileText, CheckCircle,
  AlertTriangle, ShieldCheck, Clock, RefreshCw, AlertCircle,
  Edit2, Eye, Download, Send, Plus, Check, X, Info,
  History, HelpCircle, ExternalLink, ChevronDown, ChevronRight
} from 'lucide-react';
import { applicationsAPI, documentsAPI } from '../api/endpoints';
import { useAuth } from '../contexts/AuthContext';
import {
  STATUS_LABELS, STATUS_CLASSES, SEVERITY_CLASSES,
  FINDING_TYPE_LABELS, FINDING_STATUS_CLASSES,
  VERIFICATION_STATUS_CLASSES, formatDateTime, formatDate,
  formatBytes, truncateHash
} from '../components/statusHelpers';

const DOCUMENT_CATEGORIES = [
  { value: 'land_title_deed', label: 'Land Title Deed / Ownership / Lease' },
  { value: 'building_plan_approval', label: 'Approved Building Plan (PWD/Competent Authority)' },
  { value: 'occupancy_certificate', label: 'Occupancy / Completion Certificate' },
  { value: 'fire_safety_noc', label: 'Fire Safety Certificate / NOC' },
  { value: 'structural_stability', label: 'Structural Stability Certificate' },
  { value: 'society_trust_registration', label: 'Society / Trust / Company Registration' },
  { value: 'faculty_cadre_ratio', label: 'Faculty List & Cadre Ratio Document' },
  { value: 'salary_bank_statement', label: 'Faculty Salary Bank Statements' },
  { value: 'affidavit_compliance', label: 'Affidavit for Regulatory Compliance' },
  { value: 'other', label: 'Other Regulatory Document' }
];

export default function ApplicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [application, setApplication] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [findings, setFindings] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState('overview'); // overview, documents, findings, verifications, rectifications, audit

  // Actions states
  const [validating, setValidating] = useState(false);
  const [validationSuccess, setValidationSuccess] = useState(null);

  // Upload modal / file selection
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('land_title_deed');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  // Field edit modal
  const [editingField, setEditingField] = useState(null);
  const [correctedValue, setCorrectedValue] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [correcting, setCorrecting] = useState(false);

  // Rectification modal
  const [rectificationModalOpen, setRectificationModalOpen] = useState(false);
  const [rectificationTitle, setRectificationTitle] = useState('');
  const [rectificationDetails, setRectificationDetails] = useState('');
  const [rectificationDeadline, setRectificationDeadline] = useState('');
  const [submittingRectification, setSubmittingRectification] = useState(false);

  // Status update
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  const fetchApplicationData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [appRes, docsRes, findingsRes, checklistRes, auditRes] = await Promise.allSettled([
        applicationsAPI.get(id),
        applicationsAPI.listDocuments(id),
        applicationsAPI.getFindings(id),
        applicationsAPI.getChecklist(id),
        applicationsAPI.getAudit(id),
      ]);

      if (appRes.status === 'fulfilled') {
        setApplication(appRes.value.data.data || appRes.value.data);
      } else {
        throw new Error(appRes.reason?.response?.data?.message || 'Failed to load application');
      }

      if (docsRes.status === 'fulfilled') {
        setDocuments(docsRes.value.data.data?.documents || docsRes.value.data.documents || docsRes.value.data || []);
      }
      if (findingsRes.status === 'fulfilled') {
        setFindings(findingsRes.value.data.data?.findings || findingsRes.value.data.findings || findingsRes.value.data || []);
      }
      if (checklistRes.status === 'fulfilled') {
        setChecklist(checklistRes.value.data.data?.checklist || checklistRes.value.data.checklist || checklistRes.value.data || []);
      }
      if (auditRes.status === 'fulfilled') {
        setAuditLogs(auditRes.value.data.data?.logs || auditRes.value.data.logs || auditRes.value.data || []);
      }
    } catch (err) {
      console.error('Error fetching application details', err);
      setError(err.message || 'Failed to load application details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicationData();
  }, [id]);

  const handleRunValidation = async () => {
    try {
      setValidating(true);
      setValidationSuccess(null);
      const res = await applicationsAPI.validate(id, {});
      setValidationSuccess('Validation and cross-document verification completed.');
      fetchApplicationData();
    } catch (err) {
      console.error('Validation error', err);
      setError(err.response?.data?.message || 'Failed to execute validation rules');
    } finally {
      setValidating(false);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);

      const formData = new FormData();
      formData.append('document', uploadFile);
      // Backend reads 'documentType' from body (schema field name)
      formData.append('documentType', uploadCategory);

      await applicationsAPI.uploadDocument(id, formData);
      setUploadModalOpen(false);
      setUploadFile(null);
      // Refresh immediately to show the new document card
      fetchApplicationData();
      // Then refresh again after a delay to pick up async OCR results
      setTimeout(fetchApplicationData, 4000);
    } catch (err) {
      console.error('Upload error', err);
      setUploadError(err.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveCorrection = async () => {
    if (!editingField || !correctedValue.trim()) return;

    try {
      setCorrecting(true);
      await documentsAPI.correctField(editingField.documentId, editingField.fieldKey, {
        correctedValue,
        reason: correctionReason || 'Manual reviewer correction',
      });
      setEditingField(null);
      setCorrectedValue('');
      setCorrectionReason('');
      fetchApplicationData();
    } catch (err) {
      console.error('Field correction error', err);
      alert(err.response?.data?.message || 'Failed to update field value');
    } finally {
      setCorrecting(false);
    }
  };

  const handleRequestRectification = async (e) => {
    e.preventDefault();
    try {
      setSubmittingRectification(true);
      await applicationsAPI.requestRectification(id, {
        title: rectificationTitle,
        details: rectificationDetails,
        deadline: rectificationDeadline,
      });
      setRectificationModalOpen(false);
      setRectificationTitle('');
      setRectificationDetails('');
      setRectificationDeadline('');
      fetchApplicationData();
    } catch (err) {
      console.error('Rectification request error', err);
      alert(err.response?.data?.message || 'Failed to request rectification');
    } finally {
      setSubmittingRectification(false);
    }
  };

  const handleStatusChange = async (status) => {
    try {
      setUpdatingStatus(true);
      await applicationsAPI.updateStatus(id, { status });
      fetchApplicationData();
    } catch (err) {
      console.error('Status update failed', err);
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading && !application) {
    return (
      <div className="py-24 text-center text-slate-400">
        <RefreshCw size={28} className="animate-spin mx-auto mb-3 text-primary" />
        <p className="text-sm font-medium">Loading application dossier...</p>
      </div>
    );
  }

  if (error && !application) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 text-red-700 rounded-xl space-y-3">
        <div className="flex items-center gap-2 font-bold">
          <AlertCircle size={20} />
          <span>Application Not Found or Inaccessible</span>
        </div>
        <p className="text-xs">{error}</p>
        <Link to="/applications" className="btn btn-secondary text-xs">
          Return to Applications List
        </Link>
      </div>
    );
  }

  const isReviewerOrAdmin = ['scrutiny_officer', 'evaluator', 'admin'].includes(user?.role);

  return (
    <div className="space-y-6">
      {/* Back button and Advisory */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/applications" className="btn btn-secondary btn-sm p-2">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900">
                {application?.applicationNumber || 'Application Dossier'}
              </h1>
              <span className={`badge ${STATUS_CLASSES[application?.status] || 'badge-neutral'}`}>
                {STATUS_LABELS[application?.status] || application?.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {application?.institutionId?.name || application?.institutionDetails?.name || 'Institution'} &bull; Academic Year: {application?.academicYear || '2026-2027'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRunValidation}
            disabled={validating}
            className="btn btn-primary text-xs py-2"
          >
            <ShieldCheck size={14} className={validating ? 'animate-spin' : ''} />
            {validating ? 'Running Rules...' : 'Run Compliance Engine'}
          </button>

          {isReviewerOrAdmin && (
            <button
              onClick={() => setRectificationModalOpen(true)}
              className="btn btn-secondary text-xs py-2 text-amber-700 hover:bg-amber-50"
            >
              <AlertTriangle size={14} /> Request Rectification
            </button>
          )}

          {isReviewerOrAdmin && (
            <div className="relative inline-block">
              <select
                disabled={updatingStatus}
                value={application?.status || ''}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="form-select text-xs py-2 bg-slate-100 font-medium"
              >
                <option value="under_review">Mark: Under Review</option>
                <option value="rectification_requested">Mark: Rectification Requested</option>
                <option value="approved">Mark: Approved</option>
                <option value="rejected">Mark: Rejected</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {validationSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <CheckCircle size={16} className="text-emerald-600" /> {validationSuccess}
          </span>
          <button onClick={() => setValidationSuccess(null)} className="text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Advisory Banner */}
      <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2.5">
        <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="leading-relaxed">
          <span className="font-semibold">Verification System Scope: </span>
          All confidence scores, extracted field matches, and missing document flags generated below are
          automated diagnostic indicators. Issuing authority validations (e.g. Land Registry, Fire Dept)
          clearly indicate when live external APIs are simulated or manual inspection is required.
        </p>
      </div>

      {/* Dossier Navigation Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto text-xs font-medium">
        {[
          { key: 'overview', label: 'Overview & Checklist', icon: FolderOpen, count: null },
          { key: 'documents', label: 'Documents & Extractions', icon: FileText, count: documents.length },
          { key: 'findings', label: 'Compliance Findings', icon: AlertTriangle, count: findings.length },
          { key: 'verifications', label: 'Authenticity & Signatures', icon: ShieldCheck, count: null },
          { key: 'rectifications', label: 'Rectifications', icon: RefreshCw, count: application?.rectifications?.length || 0 },
          { key: 'audit', label: 'Audit Trail', icon: History, count: auditLogs.length },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-primary text-primary font-bold bg-primary/5 rounded-t-lg'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  isActive ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview & Checklist */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Institution Profile */}
            <div className="card p-5 border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                <FolderOpen size={16} className="text-primary" /> Institutional Profile & Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Institution Legal Name</span>
                  <span className="font-semibold text-slate-800">
                    {application?.institutionId?.name || application?.institutionDetails?.name || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">AICTE Permanent ID</span>
                  <span className="font-mono text-slate-800">
                    {application?.institutionId?.aictePermanentId || application?.institutionDetails?.aictePermanentId || 'Pending'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Application Category</span>
                  <span className="capitalize font-semibold text-slate-800">
                    {application?.applicationType?.replace(/_/g, ' ') || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">State & District</span>
                  <span className="text-slate-800">
                    {application?.institutionDetails?.district || '—'}, {application?.institutionDetails?.state || '—'}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400 block mb-0.5">Campus Address</span>
                  <span className="text-slate-800">
                    {application?.institutionDetails?.address || '—'} (PIN: {application?.institutionDetails?.pinCode || '—'})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Head of Institution / Contact</span>
                  <span className="font-semibold text-slate-800">
                    {application?.contactPerson?.name || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Contact Email & Phone</span>
                  <span className="text-slate-800">
                    {application?.contactPerson?.email || '—'} &bull; {application?.contactPerson?.phone || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Checklist Coverage */}
            <div className="card p-5 border border-slate-200">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Mandatory Regulatory Checklist</h3>
                  <p className="text-xs text-slate-500">Prerequisites required by AICTE Approval Process Handbook</p>
                </div>
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className="btn btn-primary text-xs py-1.5 px-3"
                >
                  <Upload size={13} /> Upload Document
                </button>
              </div>

              {checklist.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-lg text-center text-xs text-slate-500">
                  Standard AICTE mandatory checklist applies. Check the Documents tab to verify attached files.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {checklist.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-3">
                        {item.status === 'completed' || item.status === 'uploaded' ? (
                          <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                            <Check size={12} />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                            <Clock size={12} />
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-semibold text-slate-800">{item.name || item.category}</p>
                          <p className="text-[11px] text-slate-400">{item.description || 'Mandatory compliance document'}</p>
                        </div>
                      </div>
                      <span className={`badge text-[10px] ${
                        item.status === 'completed' || item.status === 'uploaded' ? 'badge-success' : 'badge-warning'
                      }`}>
                        {item.status || 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics & Summary */}
          <div className="space-y-6">
            <div className="card p-5 border border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Submission Summary</h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Documents Attached</span>
                  <span className="font-bold text-slate-800">{documents.length} files</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Open Discrepancies</span>
                  <span className="font-bold text-red-600">{findings.filter(f => f.status === 'open').length}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Created On</span>
                  <span className="text-slate-700">{formatDate(application?.createdAt)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Last Scrutiny Activity</span>
                  <span className="text-slate-700">{formatDateTime(application?.updatedAt)}</span>
                </div>
              </div>
            </div>

            {/* Quick Upload CTA */}
            <div className="card p-5 border border-slate-200 bg-slate-50">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Need to attach documents?
              </h4>
              <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                Upload scanned land deeds, building plans, fire safety NOCs, or faculty lists for OCR parsing.
              </p>
              <button
                onClick={() => setUploadModalOpen(true)}
                className="btn btn-primary w-full text-xs justify-center py-2"
              >
                <Upload size={14} /> Upload New Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Documents & OCR Extractions */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Uploaded Documents &amp; OCR Extractions</h2>
              <p className="text-xs text-slate-500">
                View extracted fields, OCR confidence scores, and perform manual field adjustments
              </p>
            </div>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="btn btn-primary text-xs py-2"
            >
              <Upload size={14} /> Upload Document
            </button>
          </div>

          {documents.length === 0 ? (
            <div className="card p-12 text-center border border-slate-200">
              <FileText size={40} className="mx-auto text-slate-300 mb-3" />
              <h3 className="text-sm font-semibold text-slate-700">No Documents Uploaded Yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Upload your institutional PDFs (Land deed, NOC, Building approval) to trigger OCR text extraction and field identification.
              </p>
              <button
                onClick={() => setUploadModalOpen(true)}
                className="btn btn-primary text-xs mt-4 inline-flex items-center gap-1.5"
              >
                <Upload size={14} /> Upload Document Now
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {documents.map((doc) => {
                // ── Correct DB field names ──
                const filename = doc.originalFilename || doc.originalName || doc.fileName || 'Uploaded Document';
                const docType = doc.documentType || doc.category;
                const fileSize = doc.sizeBytes || doc.fileSize;
                const hash = doc.sha256Hash || doc.fileHash;
                const procStatus = doc.processingStatus || doc.ocrProcessingStatus || 'pending';
                const procError = doc.processingError;
                // extractedFields is now an array of ExtractedField objects from the DB
                const fields = Array.isArray(doc.extractedFields) ? doc.extractedFields : [];
                const extractedCount = fields.filter(f => f.extractedValue !== null && f.extractedValue !== undefined && f.status !== 'missing').length;
                const missingCount = fields.filter(f => f.status === 'missing').length;
                const uncertainCount = fields.filter(f => f.status === 'extraction_uncertain').length;

                // Overall doc confidence = avg of non-missing fields
                const nonMissingFields = fields.filter(f => f.status !== 'missing' && f.confidence > 0);
                const avgConfidence = nonMissingFields.length > 0
                  ? nonMissingFields.reduce((s, f) => s + f.confidence, 0) / nonMissingFields.length
                  : null;

                const statusBadgeClass =
                  procStatus === 'completed' ? 'badge-success'
                  : procStatus === 'failed' ? 'badge-danger'
                  : procStatus === 'processing' ? 'badge-info'
                  : 'badge-warning';

                const confColor = avgConfidence === null ? 'bg-slate-200'
                  : avgConfidence >= 0.8 ? 'bg-emerald-500'
                  : avgConfidence >= 0.6 ? 'bg-amber-400'
                  : 'bg-red-500';

                return (
                  <div key={doc._id} className="card border border-slate-200 overflow-hidden">
                    {/* Doc Header */}
                    <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 bg-slate-50/40">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 border border-blue-100">
                          <FileText size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 leading-tight">{filename}</h4>
                          <div className="flex items-center flex-wrap gap-1.5 text-[11px] text-slate-400 mt-0.5">
                            {docType && (
                              <span className="capitalize font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                {docType.replace(/_/g, ' ')}
                              </span>
                            )}
                            {fileSize && <span>{(fileSize / 1024).toFixed(1)} KB</span>}
                            <span>·</span>
                            <span>Uploaded {new Date(doc.createdAt).toLocaleDateString('en-IN')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status + Actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`badge text-[10px] uppercase ${statusBadgeClass}`}>
                          OCR: {procStatus}
                        </span>

                        {avgConfidence !== null && (
                          <span className={`badge text-[10px] ${
                            avgConfidence >= 0.8 ? 'badge-success' : avgConfidence >= 0.6 ? 'badge-warning' : 'badge-danger'
                          }`}>
                            Avg Confidence: {Math.round(avgConfidence * 100)}%
                          </span>
                        )}

                        {/* Reprocess button for failed/pending/no-fields docs */}
                        {(procStatus === 'failed' || procStatus === 'pending' || (procStatus === 'completed' && fields.length === 0)) && (
                          <button
                            onClick={async () => {
                              try {
                                await documentsAPI.reprocess(doc._id);
                                setTimeout(fetchApplicationData, 1500);
                              } catch (e) {
                                alert(e?.response?.data?.message || 'Re-process failed');
                              }
                            }}
                            className="btn btn-secondary btn-sm text-[11px] py-1 px-2 text-blue-700 hover:bg-blue-50"
                            title="Re-trigger OCR Processing"
                          >
                            <RefreshCw size={12} /> Re-process
                          </button>
                        )}

                        <a
                          href={`http://localhost:5000/api/documents/${doc._id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary btn-sm p-1.5 text-slate-500 hover:text-primary"
                          title="Download original file"
                        >
                          <Download size={14} />
                        </a>
                      </div>
                    </div>

                    {/* SHA-256 Tamper Evidence */}
                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 font-mono text-[10px] text-slate-500 flex items-center gap-2 overflow-hidden">
                      <span className="text-slate-400 shrink-0">SHA-256:</span>
                      <span className="text-slate-600 truncate select-all">{hash || 'Computed on ingest'}</span>
                    </div>

                    {/* Processing Error Banner */}
                    {procError && (
                      <div className="px-4 py-2.5 bg-red-50 border-b border-red-100 text-xs text-red-700 flex items-center gap-2">
                        <AlertCircle size={14} className="shrink-0" />
                        <span><span className="font-semibold">Processing error:</span> {procError}</span>
                      </div>
                    )}

                    <div className="p-4 space-y-4">
                      {/* Extraction Summary Bar */}
                      {procStatus === 'completed' && fields.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-700">Extraction Coverage</span>
                            <div className="flex items-center gap-3 text-slate-500">
                              <span className="text-emerald-600 font-medium">{extractedCount} extracted</span>
                              {uncertainCount > 0 && <span className="text-amber-600 font-medium">{uncertainCount} uncertain</span>}
                              {missingCount > 0 && <span className="text-slate-400">{missingCount} not found</span>}
                            </div>
                          </div>
                          {avgConfidence !== null && (
                            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${confColor}`}
                                style={{ width: `${Math.round(avgConfidence * 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Extracted Fields Table */}
                      <div>
                        <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Eye size={13} className="text-slate-400" />
                          Structured Fields Extracted
                        </h5>

                        {procStatus === 'processing' ? (
                          <div className="p-4 bg-blue-50 rounded-lg text-xs text-blue-700 flex items-center gap-2">
                            <RefreshCw size={13} className="animate-spin" />
                            OCR processing in progress — fields will appear shortly.
                          </div>
                        ) : procStatus === 'pending' ? (
                          <div className="p-4 bg-amber-50 rounded-lg text-xs text-amber-700 flex items-center gap-2">
                            <Clock size={13} />
                            Waiting for processor. Click Re-process if this persists.
                          </div>
                        ) : fields.length === 0 ? (
                          <div className="p-4 bg-slate-50 rounded-lg text-xs text-slate-500 flex items-center gap-2">
                            <HelpCircle size={13} />
                            No fields extracted. The document may be a scanned image without text, or the processor was unavailable. Try Re-processing.
                          </div>
                        ) : (
                          <div className="overflow-x-auto border border-slate-100 rounded-xl">
                            <table className="w-full text-left text-xs divide-y divide-slate-100">
                              <thead className="bg-slate-50 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                                <tr>
                                  <th className="py-2.5 px-3">Field</th>
                                  <th className="py-2.5 px-3">Extracted Value</th>
                                  <th className="py-2.5 px-3">Confidence</th>
                                  <th className="py-2.5 px-3">Method</th>
                                  <th className="py-2.5 px-3">Status</th>
                                  {isReviewerOrAdmin && <th className="py-2.5 px-3 text-right">Override</th>}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {fields.map((field) => {
                                  const displayValue = field.correctedValue ?? field.extractedValue;
                                  const conf = field.confidence;
                                  const isMissing = field.status === 'missing';
                                  const isUncertain = field.status === 'extraction_uncertain';
                                  const isCorrected = field.status === 'manually_corrected';
                                  const confBarColor = conf >= 0.8 ? 'bg-emerald-500' : conf >= 0.6 ? 'bg-amber-400' : 'bg-red-400';

                                  return (
                                    <tr key={field._id} className={`hover:bg-slate-50/60 transition-colors ${isMissing ? 'opacity-60' : ''}`}>
                                      <td className="py-2.5 px-3 font-semibold text-slate-800 capitalize whitespace-nowrap">
                                        {field.fieldName?.replace(/_/g, ' ') || '—'}
                                      </td>
                                      <td className="py-2.5 px-3 font-mono text-slate-800 max-w-[200px] truncate">
                                        {isMissing ? (
                                          <span className="text-slate-400 font-sans not-italic">Not detected</span>
                                        ) : isCorrected ? (
                                          <span className="text-blue-700 font-medium">
                                            {String(displayValue)}
                                            <span className="ml-1 text-[10px] text-blue-400 font-normal">(corrected)</span>
                                          </span>
                                        ) : (
                                          <span>{displayValue !== null && displayValue !== undefined ? String(displayValue) : '—'}</span>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3">
                                        {!isMissing && conf > 0 ? (
                                          <div className="flex items-center gap-2">
                                            <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden flex-shrink-0">
                                              <div
                                                className={`h-full rounded-full ${confBarColor}`}
                                                style={{ width: `${Math.round(conf * 100)}%` }}
                                              />
                                            </div>
                                            <span className={`font-medium ${conf >= 0.8 ? 'text-emerald-600' : conf >= 0.6 ? 'text-amber-600' : 'text-red-600'}`}>
                                              {Math.round(conf * 100)}%
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-slate-300">—</span>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3">
                                        <span className="text-slate-400 text-[11px] capitalize">
                                          {field.extractionMethod?.replace(/_/g, ' ') || '—'}
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-3">
                                        {isMissing && <span className="badge badge-neutral text-[10px]">missing</span>}
                                        {isUncertain && <span className="badge badge-warning text-[10px]">uncertain</span>}
                                        {isCorrected && <span className="badge badge-info text-[10px]">corrected</span>}
                                        {field.status === 'extracted' && <span className="badge badge-success text-[10px]">extracted</span>}
                                      </td>
                                      {isReviewerOrAdmin && (
                                        <td className="py-2.5 px-3 text-right">
                                          {!isMissing && (
                                            <button
                                              onClick={() => {
                                                setEditingField({
                                                  documentId: doc._id,
                                                  fieldKey: field._id,
                                                  fieldName: field.fieldName,
                                                  currentValue: displayValue ? String(displayValue) : '',
                                                });
                                                setCorrectedValue(displayValue ? String(displayValue) : '');
                                              }}
                                              className="inline-flex items-center gap-1 text-primary hover:text-primary-dark font-medium text-[11px]"
                                            >
                                              <Edit2 size={11} /> Edit
                                            </button>
                                          )}
                                        </td>
                                      )}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Findings & Discrepancies */}
      {activeTab === 'findings' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Compliance & Consistency Findings</h2>
              <p className="text-xs text-slate-500">
                Automated cross-check discrepancies detected between uploaded evidence and regulatory rules
              </p>
            </div>
            <button
              onClick={handleRunValidation}
              disabled={validating}
              className="btn btn-secondary text-xs py-2"
            >
              <RefreshCw size={13} className={validating ? 'animate-spin' : ''} />
              Re-run Cross Check
            </button>
          </div>

          {findings.length === 0 ? (
            <div className="card p-12 text-center border border-slate-200">
              <CheckCircle size={40} className="mx-auto text-emerald-500 mb-3" />
              <h3 className="text-sm font-semibold text-slate-800">No Discrepancies Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No active regulatory violations or document discrepancies are currently logged.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {findings.map((f) => (
                <div
                  key={f._id}
                  className={`p-4 rounded-xl border transition-all ${
                    f.severity === 'critical'
                      ? 'border-red-200 bg-red-50/40'
                      : f.severity === 'major'
                      ? 'border-amber-200 bg-amber-50/40'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 p-1.5 rounded-lg ${
                        f.severity === 'critical'
                          ? 'bg-red-100 text-red-700'
                          : f.severity === 'major'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        <AlertTriangle size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900">{f.checkName || f.title || 'Discrepancy Finding'}</h4>
                          <span className={`badge ${SEVERITY_CLASSES[f.severity] || 'badge-neutral'} uppercase text-[10px]`}>
                            {f.severity}
                          </span>
                          <span className={`badge ${FINDING_STATUS_CLASSES[f.status] || 'badge-neutral'} text-[10px]`}>
                            {f.status}
                          </span>
                          {f.ruleId && (
                            <span className="badge badge-neutral text-[10px] font-mono">
                              {typeof f.ruleId === 'object' ? f.ruleId.name || f.ruleId.ruleId : f.ruleId}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">{f.explanation || f.description}</p>

                        {/* Evidence & Comparison Box */}
                        {(f.observedValue || f.expectedValue) && (
                          <div className="mt-2.5 p-2.5 rounded-lg bg-white/90 border border-slate-200 text-xs space-y-1">
                            {f.observedValue && (
                              <div className="flex items-start gap-1.5">
                                <span className="font-semibold text-slate-600 flex-shrink-0">Observed Evidence:</span>
                                <span className="font-mono text-red-600 break-all">{typeof f.observedValue === 'object' ? JSON.stringify(f.observedValue) : String(f.observedValue)}</span>
                              </div>
                            )}
                            {f.expectedValue && (
                              <div className="flex items-start gap-1.5">
                                <span className="font-semibold text-slate-600 flex-shrink-0">AICTE Regulatory Standard:</span>
                                <span className="font-mono text-emerald-700">{typeof f.expectedValue === 'object' ? JSON.stringify(f.expectedValue) : String(f.expectedValue)}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Affected Details */}
                        <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-slate-500">
                          {f.document && (
                            <span>
                              <span className="font-semibold text-slate-700">Source Document: </span>
                              {f.document?.originalFilename || f.document?.title || 'Document'}
                            </span>
                          )}
                          {f.findingType && (
                            <span>
                              <span className="font-semibold text-slate-700">Type: </span>
                              {FINDING_TYPE_LABELS[f.findingType] || f.findingType}
                            </span>
                          )}
                          {f.suggestedAction && (
                            <span className="w-full text-slate-700 bg-white/80 p-2 rounded border border-slate-200">
                              <span className="font-semibold text-primary">Suggested Rectification: </span>
                              {f.suggestedAction}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Authenticity & Signatures */}
      {activeTab === 'verifications' && (
        <div className="space-y-6">
          <div className="card p-5 border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck size={16} className="text-primary" /> Document Authenticity & Cryptographic Verification
            </h3>
            <p className="text-xs text-slate-500">
              Analysis of Digital Signature Certificates (DSC), embedded QR codes, and issuing authority verification pipelines.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Digital Signature (DSC)</span>
                <p className="text-xs text-slate-500">
                  Validates cryptographic X.509 certificates applied to approval orders and affidavits.
                </p>
                <div className="pt-2">
                  <span className="badge badge-info text-[10px]">verification_pending</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                <span className="text-xs font-bold text-slate-700 block">QR Code Verification</span>
                <p className="text-xs text-slate-500">
                  Scans embedded 2D barcodes for issuer URIs, transaction tokens, and validity seals.
                </p>
                <div className="pt-2">
                  <span className="badge badge-success text-[10px]">qr_engine_active</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Issuing Authority Check</span>
                <p className="text-xs text-slate-500">
                  Direct API query to Revenue Dept / Land Registry / Fire Services if credentials are wired.
                </p>
                <div className="pt-2">
                  <span className="badge badge-neutral text-[10px]">source_unavailable</span>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
              <Info size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <span>
                <strong>Integrity Policy: </strong>
                Where external state portals (e.g. Bhulekh, Fire Safety Directorate) do not provide open programmatic verification APIs,
                the platform records a <code className="bg-amber-100 px-1 rounded">manual_review_required</code> status. We never fake a positive verification.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Rectifications Workflow */}
      {activeTab === 'rectifications' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Rectification Requests & Responses</h2>
              <p className="text-xs text-slate-500">
                Official discrepancy notices issued to the institution and their submitted corrections
              </p>
            </div>
            {isReviewerOrAdmin && (
              <button
                onClick={() => setRectificationModalOpen(true)}
                className="btn btn-primary text-xs py-2"
              >
                <Plus size={14} /> New Rectification Request
              </button>
            )}
          </div>

          {!application?.rectifications?.length ? (
            <div className="card p-12 text-center border border-slate-200">
              <RefreshCw size={40} className="mx-auto text-slate-300 mb-3" />
              <h3 className="text-sm font-semibold text-slate-700">No Rectifications Outstanding</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No rectification notices have been issued for this application dossier.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {application.rectifications.map((rec, index) => (
                <div key={index} className="card p-5 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-900">{rec.title || `Notice #${index + 1}`}</h4>
                    <span className="badge badge-warning text-[10px] capitalize">
                      {rec.status || 'Pending Response'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{rec.details || rec.remarks}</p>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                    <span>Deadline: {formatDate(rec.deadline)}</span>
                    <span>Issued: {formatDate(rec.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 6: Audit Trail */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Immutable Audit Trail</h2>
            <p className="text-xs text-slate-500">
              Chronological cryptographic log of all scrutiny events, uploads, corrections, and evaluations
            </p>
          </div>

          {auditLogs.length === 0 ? (
            <div className="card p-12 text-center border border-slate-200 text-xs text-slate-500">
              No audit events logged yet.
            </div>
          ) : (
            <div className="card p-0 border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs divide-y divide-slate-100">
                  <thead className="bg-slate-50 text-slate-500 font-semibold text-[11px]">
                    <tr>
                      <th className="py-2.5 px-4">Timestamp</th>
                      <th className="py-2.5 px-4">Action</th>
                      <th className="py-2.5 px-4">Actor</th>
                      <th className="py-2.5 px-4">Entity Type</th>
                      <th className="py-2.5 px-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-700">
                    {auditLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">
                          {formatDateTime(log.createdAt || log.timestamp)}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-800 capitalize">
                          {log.action?.replace(/_/g, ' ')}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="font-medium text-slate-700">{log.userId?.name || log.actorName || 'System'}</span>
                          <span className="text-[10px] text-slate-400 block capitalize">
                            {log.userId?.role || log.actorRole || 'Engine'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 capitalize text-slate-600">
                          {log.entityType?.replace(/_/g, ' ') || 'Application'}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px] truncate max-w-xs">
                          {log.details ? JSON.stringify(log.details) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Upload Regulatory Document</h3>
              <button onClick={() => setUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg">{uploadError}</div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="form-label">Document Category *</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="form-select text-xs"
                >
                  {DOCUMENT_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Select File (PDF or Image) *</label>
                <input
                  type="file"
                  required
                  ref={fileInputRef}
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="btn btn-primary text-xs"
                >
                  {uploading ? 'Processing OCR...' : 'Upload & Extract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Field Edit Modal */}
      {editingField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Correct Extracted Field</h3>
              <button onClick={() => setEditingField(null)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Field Name</span>
                <span className="font-semibold text-slate-800 capitalize">
                  {editingField.fieldName?.replace(/_/g, ' ') || editingField.fieldKey?.replace(/_/g, ' ')}
                </span>
              </div>

              <div>
                <label className="form-label">Corrected Value *</label>
                <input
                  type="text"
                  value={correctedValue}
                  onChange={(e) => setCorrectedValue(e.target.value)}
                  className="form-input text-xs"
                  placeholder="Enter true inspected value"
                />
              </div>

              <div>
                <label className="form-label">Reason for Override *</label>
                <textarea
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="form-input text-xs h-20"
                  placeholder="Explain reason for manual intervention (logged to audit trail)"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingField(null)}
                className="btn btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={correcting}
                onClick={handleSaveCorrection}
                className="btn btn-primary text-xs"
              >
                {correcting ? 'Saving Override...' : 'Confirm Override'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rectification Modal */}
      {rectificationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Issue Rectification Notice</h3>
              <button onClick={() => setRectificationModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRequestRectification} className="space-y-3 text-xs">
              <div>
                <label className="form-label">Notice Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Fire Safety NOC Expiry Discrepancy"
                  value={rectificationTitle}
                  onChange={(e) => setRectificationTitle(e.target.value)}
                  className="form-input text-xs"
                />
              </div>

              <div>
                <label className="form-label">Deficiency Details & Instructions *</label>
                <textarea
                  required
                  placeholder="Specify missing certificates, contradictory land area entries, or required affidavits..."
                  value={rectificationDetails}
                  onChange={(e) => setRectificationDetails(e.target.value)}
                  className="form-input text-xs h-24"
                />
              </div>

              <div>
                <label className="form-label">Submission Deadline *</label>
                <input
                  type="date"
                  required
                  value={rectificationDeadline}
                  onChange={(e) => setRectificationDeadline(e.target.value)}
                  className="form-input text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRectificationModalOpen(false)}
                  className="btn btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRectification}
                  className="btn btn-primary text-xs"
                >
                  {submittingRectification ? 'Issuing...' : 'Issue Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
