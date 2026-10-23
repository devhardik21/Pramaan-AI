import { useState, useEffect } from 'react';
import {
  BookOpen, Search, Send, Upload, FileText, CheckCircle,
  AlertCircle, RefreshCw, Bookmark, Sparkles, ExternalLink, HelpCircle
} from 'lucide-react';
import { regulatoryAPI } from '../api/endpoints';

const SAMPLE_QUERIES = [
  'What is the minimum land requirement for establishing an Engineering college in a Mega/Metro city?',
  'What is the mandatory Faculty-to-Student Cadre Ratio for Undergraduate Technical programmes?',
  'What are the mandatory Fire Safety NOC and Occupancy certificate requirements for EoA?',
  'What are the norms for introducing Emerging Areas / AI & Data Science courses?'
];

export default function RegulatoryRAGPage() {
  const [query, setQuery] = useState('');
  const [asking, setAsking] = useState(false);
  const [answerData, setAnswerData] = useState(null);
  const [error, setError] = useState(null);

  // Regulatory sources
  const [sources, setSources] = useState([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [sourceTitle, setSourceTitle] = useState('');
  const [sourceVersion, setSourceVersion] = useState('2026-2027');
  const [sourceFile, setSourceFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fetchSources = async () => {
    try {
      setLoadingSources(true);
      const res = await regulatoryAPI.listSources();
      setSources(res.data.data?.sources || res.data.sources || res.data.data || []);
    } catch (err) {
      console.error('Failed to load regulatory sources', err);
    } finally {
      setLoadingSources(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleAsk = async (userQuery) => {
    const q = userQuery || query;
    if (!q.trim()) return;

    try {
      setAsking(true);
      setError(null);
      setAnswerData(null);

      const res = await regulatoryAPI.ask({ query: q });
      setAnswerData(res.data.data || res.data);
    } catch (err) {
      console.error('RAG Query failed', err);
      setError(err.response?.data?.message || 'Failed to query regulatory vector store');
    } finally {
      setAsking(false);
    }
  };

  const handleUploadSource = async (e) => {
    e.preventDefault();
    if (!sourceFile) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('document', sourceFile);
      formData.append('title', sourceTitle || sourceFile.name);
      formData.append('version', sourceVersion);

      await regulatoryAPI.uploadSource(formData);
      setUploadModalOpen(false);
      setSourceFile(null);
      setSourceTitle('');
      fetchSources();
    } catch (err) {
      console.error('Failed to upload regulatory source', err);
      alert(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="text-primary" size={26} />
            AICTE Regulatory Assistant (APH RAG)
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Semantic clause search & grounded Q&A across the official AICTE Approval Process Handbook (APH).
          </p>
        </div>
        <button
          onClick={() => setUploadModalOpen(true)}
          className="btn btn-secondary text-xs py-2 self-start sm:self-auto"
        >
          <Upload size={14} /> Index New Regulation PDF
        </button>
      </div>

      {/* Query Bar */}
      <div className="card p-5 border border-slate-200 space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            className="form-input text-xs py-3 pr-28 pl-4 rounded-xl shadow-sm border-slate-300 focus:ring-2 focus:ring-primary/20"
            placeholder="Ask anything about AICTE norms (e.g. land criteria, cadre ratios, building norms)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="submit"
            disabled={asking || !query.trim()}
            className="absolute right-2 btn btn-primary text-xs py-2 px-4 rounded-lg"
          >
            {asking ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
            <span>Ask</span>
          </button>
        </form>

        {/* Suggested Queries */}
        <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
          <span className="text-slate-400 font-medium">Suggested queries:</span>
          {SAMPLE_QUERIES.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setQuery(sample);
                handleAsk(sample);
              }}
              className="text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md text-[11px] transition text-left"
            >
              {sample}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Answer & Passages Display */}
      {answerData && (
        <div className="space-y-6">
          {/* Answer Card */}
          <div className="card p-6 border border-primary/20 bg-gradient-to-b from-primary/5 to-white shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Sparkles size={18} />
              <span>Regulatory Answer & Norm Synthesis</span>
            </div>

            <div className="text-xs text-slate-800 leading-relaxed space-y-2 whitespace-pre-line">
              {answerData.answer || 'Relevant passages extracted from the regulatory store:'}
            </div>

            {answerData.citations && answerData.citations.length > 0 && (
              <div className="pt-3 border-t border-slate-200/60">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                  Referenced Regulations & Handbook Clauses
                </span>
                <div className="flex flex-wrap gap-2">
                  {answerData.citations.map((c, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-md text-xs font-mono text-slate-700 shadow-2xs"
                    >
                      <Bookmark size={12} className="text-primary" />
                      {typeof c === 'string' ? c : `${c.source} (p. ${c.page || '—'})`}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Retrieved Grounding Passages */}
          {answerData.passages && answerData.passages.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Retrieved Context Passages from Vector Store
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {answerData.passages.map((p, index) => (
                  <div key={index} className="card p-4 border border-slate-200 text-xs space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 border-b border-slate-100">
                      <span className="font-semibold text-slate-700 flex items-center gap-1">
                        <FileText size={12} /> {p.metadata?.source || p.source || 'APH Handbook'}
                      </span>
                      {p.metadata?.page && <span>Page {p.metadata.page}</span>}
                    </div>
                    <p className="text-slate-600 leading-relaxed font-serif text-[11px] italic bg-slate-50/50 p-2.5 rounded">
                      &ldquo;{p.text || p.content}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Indexed Regulatory Sources */}
      <div className="card p-5 border border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Indexed Regulatory Handbooks & Circulars</h3>
            <p className="text-xs text-slate-500">Official vector-embedded source documents used for semantic citation</p>
          </div>
          <button
            onClick={fetchSources}
            className="btn btn-secondary btn-sm p-1.5"
            title="Refresh Sources"
          >
            <RefreshCw size={13} className={loadingSources ? 'animate-spin' : ''} />
          </button>
        </div>

        {sources.length === 0 ? (
          <div className="p-6 bg-slate-50 rounded-lg text-center text-xs text-slate-500">
            No external regulatory handbooks uploaded yet. Default AICTE Approval Process Handbook (2026-2027) rules are active in code.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sources.map((s) => (
              <div key={s._id} className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <BookOpen size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{s.title || s.fileName}</h4>
                    <p className="text-[11px] text-slate-400">Edition: {s.version || '2026-2027'}</p>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100">
                  <span>Chunks: {s.chunksCount || 'Active'}</span>
                  <span className="badge badge-success text-[10px]">Indexed</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Source Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Upload Regulatory PDF</h3>
              <button onClick={() => setUploadModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                &times;
              </button>
            </div>

            <form onSubmit={handleUploadSource} className="space-y-4 text-xs">
              <div>
                <label className="form-label">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AICTE Approval Process Handbook 2026-27"
                  className="form-input text-xs"
                  value={sourceTitle}
                  onChange={(e) => setSourceTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Handbook Version / Year</label>
                <input
                  type="text"
                  className="form-input text-xs"
                  value={sourceVersion}
                  onChange={(e) => setSourceVersion(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Handbook PDF File *</label>
                <input
                  type="file"
                  required
                  accept=".pdf"
                  onChange={(e) => setSourceFile(e.target.files[0])}
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
                  {uploading ? 'Chunking & Embedding...' : 'Ingest & Index'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
