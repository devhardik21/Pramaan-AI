import { useState } from 'react';
import {
  Image, MapPin, CheckCircle, AlertTriangle, Clock,
  Upload, Camera, ShieldAlert, Info, ExternalLink
} from 'lucide-react';

export default function EvidencePage() {
  const [evidenceList, setEvidenceList] = useState([
    {
      id: 'ev-1',
      facility: 'Computer Center / AI Lab',
      fileName: 'lab_geotagged_01.jpg',
      declaredCoords: '18.5204° N, 73.8567° E',
      extractedCoords: '18.5208° N, 73.8562° E',
      distanceOffset: '52 meters (Within 100m tolerance)',
      timestamp: '2026-10-15 11:24 AM IST',
      status: 'verified',
      cameraModel: 'Samsung SM-G991B',
    },
    {
      id: 'ev-2',
      facility: 'Main Academic Building & Entrance',
      fileName: 'campus_facade.jpg',
      declaredCoords: '18.5204° N, 73.8567° E',
      extractedCoords: '18.5201° N, 73.8569° E',
      distanceOffset: '38 meters (Within 100m tolerance)',
      timestamp: '2026-10-15 11:45 AM IST',
      status: 'verified',
      cameraModel: 'Apple iPhone 14 Pro',
    },
    {
      id: 'ev-3',
      facility: 'Chemistry / Environmental Lab',
      fileName: 'chem_lab_photo.png',
      declaredCoords: '18.5204° N, 73.8567° E',
      extractedCoords: 'No EXIF GPS metadata found',
      distanceOffset: 'Indeterminate',
      timestamp: 'Stripped EXIF headers',
      status: 'manual_review_required',
      cameraModel: 'Unknown / Web Export',
    }
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Image className="text-primary" size={26} />
          Infrastructure & Geotagged Evidence Verifier
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Validation of campus physical infrastructure, lab facilities, and geo-coordinates against declared survey parcels.
        </p>
      </div>

      {/* Advisory Banner */}
      <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start gap-2.5">
        <Info size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="leading-relaxed">
          <span className="font-bold">EXIF Geo-Verification Standard: </span>
          AICTE requires institutional evidence photos (laboratories, barrier-free access, fire hydrants) to carry verifiable EXIF GPS coordinates matching the registered campus plot coordinates within a 100m geo-fence tolerance.
        </div>
      </div>

      {/* Evidence Cards */}
      <div className="grid grid-cols-1 gap-4">
        {evidenceList.map((item) => (
          <div key={item.id} className="card p-5 border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                  <Camera size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{item.facility}</h3>
                  <p className="text-xs text-slate-400">{item.fileName} &bull; Device: {item.cameraModel}</p>
                </div>
              </div>

              <span className={`badge ${
                item.status === 'verified' ? 'badge-success' : 'badge-warning'
              } text-[10px]`}>
                {item.status === 'verified' ? 'Geo-Fence Verified' : 'manual_review_required'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-400 block mb-0.5 text-[11px]">Declared Campus Coordinates</span>
                <span className="font-mono text-slate-800 font-semibold">{item.declaredCoords}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-400 block mb-0.5 text-[11px]">Extracted EXIF GPS</span>
                <span className="font-mono text-slate-800 font-semibold">{item.extractedCoords}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <span className="text-slate-400 block mb-0.5 text-[11px]">Geo-Fence Tolerance Check</span>
                <span className={`font-semibold ${
                  item.status === 'verified' ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                  {item.distanceOffset}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
