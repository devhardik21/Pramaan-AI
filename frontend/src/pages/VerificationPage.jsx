import { useState, useEffect } from 'react';
import {
  ShieldCheck, CheckCircle, AlertTriangle, Clock, RefreshCw,
  QrCode, FileCheck, ExternalLink, Info, Search, Check, X
} from 'lucide-react';
import { VERIFICATION_STATUS_CLASSES, formatDateTime } from '../components/statusHelpers';

const AUTHORITY_INTEGRATIONS = [
  {
    name: 'State Revenue & Land Records (Bhulekh / IGR / Meebhoomi)',
    category: 'Land & Ownership Verification',
    status: 'source_unavailable',
    notes: 'State portal requires authorized department API gateway access. Offline / manual registry copy inspection active.',
  },
  {
    name: 'State Directorate of Fire & Emergency Services',
    category: 'Fire Safety Certificate / NOC',
    status: 'manual_review_required',
    notes: 'QR code verification engine scans serial and issuing date. Direct live database check awaits state clearance.',
  },
  {
    name: 'Public Works Department (PWD) / Municipal Corporation',
    category: 'Approved Building Plan & Stability',
    status: 'manual_review_required',
    notes: 'Architect registration and structural engineer license validation verified via embedded seal.',
  },
  {
    name: 'Affiliating University (State / Central Technical University)',
    category: 'University Affiliation Order',
    status: 'verification_pending',
    notes: 'Synchronization with University Examination & Faculty Portal in pilot testing.',
  },
  {
    name: 'Certifying Authority (CCA) / Digital Signature Registry',
    category: 'Cryptographic PDF Signature (DSC)',
    status: 'verified',
    notes: 'Local cryptographic X.509 certificate chain validation and Adobe-compliant timestamping active.',
  }
];

export default function VerificationPage() {
  const [activeTab, setActiveTab] = useState('integrations'); // integrations, qranalyzer

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="text-primary" size={26} />
          Verification & Issuing Authority Hub
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Multi-layer authenticity checks: Cryptographic Digital Signatures, QR integrity, and Government Authority Gateways.
        </p>
      </div>

      {/* Advisory Banner */}
      <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-lg text-xs text-amber-900 flex items-start gap-3">
        <Info size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="leading-relaxed">
          <span className="font-bold">Transparent Verification Disclosure: </span>
          Where issuing authorities do not yet expose public read-APIs, Pramaan AI explicitly marks records as{' '}
          <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">source_unavailable</code> or{' '}
          <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">manual_review_required</code>.
          We never simulate artificial approvals or represent an unverified document as authenticated.
        </div>
      </div>

      {/* Verification Tabs */}
      <div className="border-b border-slate-200 flex gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('integrations')}
          className={`py-2.5 border-b-2 transition ${
            activeTab === 'integrations'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Government Authority Gateways
        </button>
        <button
          onClick={() => setActiveTab('qranalyzer')}
          className={`py-2.5 border-b-2 transition ${
            activeTab === 'qranalyzer'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Cryptographic & QR Engine Specs
        </button>
      </div>

      {activeTab === 'integrations' && (
        <div className="grid grid-cols-1 gap-4">
          {AUTHORITY_INTEGRATIONS.map((auth, idx) => (
            <div key={idx} className="card p-5 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900">{auth.name}</h3>
                  <span className={`badge ${VERIFICATION_STATUS_CLASSES[auth.status] || 'badge-neutral'} text-[10px]`}>
                    {auth.status}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-500">{auth.category}</p>
                <p className="text-xs text-slate-600 pt-1 max-w-2xl leading-relaxed">{auth.notes}</p>
              </div>

              <div className="sm:text-right flex-shrink-0">
                <span className="text-[11px] text-slate-400 block mb-1">Assurance Level</span>
                <span className="text-xs font-semibold text-slate-700">
                  {auth.status === 'verified' ? 'Automated Native' : 'Assisted Manual'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'qranalyzer' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-5 border border-slate-200 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <QrCode size={16} className="text-primary" /> 2D Barcode & QR Code Engine
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              When documents such as Land Registry records or Fire Safety NOCs contain embedded 2D QR codes,
              the Python processor uses computer-vision decoders (pyzbar) to extract the payload URL, certificate
              serial number, and issuing date.
            </p>
            <div className="p-3 bg-slate-50 rounded-lg text-xs font-mono text-slate-700">
              Format: ISO/IEC 18004:2015 QR Code &bull; Payload extraction: Raw String & JSON
            </div>
          </div>

          <div className="card p-5 border border-slate-200 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileCheck size={16} className="text-primary" /> Digital Signature Certificate (DSC) Verifier
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Scrutinizes PDF ByteRange structures to parse PKCS#7 / CMS signatures. Identifies signer common name (CN),
              certifying organization, timestamp accuracy, and whether byte alterations occurred post-signing.
            </p>
            <div className="p-3 bg-slate-50 rounded-lg text-xs font-mono text-slate-700">
              Signature SubFilter: adbe.pkcs7.detached / ETSI.CAdES.detached
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
