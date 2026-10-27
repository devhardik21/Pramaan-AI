# Pramaan AI (प्रमाण AI)
### Intelligent Application Validation, Document Authentication & Regulatory Compliance Platform for AICTE

> **Smart India Hackathon (SIH) Solution**  
> *Advisory & Decision-Support System for Institutional Scrutiny and Approval Process Handbook (APH) Compliance.*
l
---

## 🌟 Executive Summary

**Pramaan AI** is a full-stack, enterprise-grade regulatory compliance platform designed to streamline and automate the scrutinization of institutional applications submitted to the **All India Council for Technical Education (AICTE)**.

Rather than relying on superficial form checks or manual verification of hundreds of pages of institutional proofs, Pramaan AI provides:
1. **Multi-layer Document OCR & Extraction Engine**: Extracts critical attributes (land parcel acreages, surveyed survey numbers, building floor approvals, fire safety NOC validity dates, faculty cadre ratios) and assigns explicit **confidence scores**.
2. **Deterministic Cross-Document Consistency Engine**: Validates extracted figures across independent documents (e.g., comparing Land Deed acreage with Building Plan sanction and institutional self-declarations) to catch discrepancies.
3. **AICTE Handbook Semantic RAG (Retrieval-Augmented Generation)**: High-speed semantic search and citation of clauses from the AICTE Approval Process Handbook (APH 2026–27) with persistent chunk metadata (edition, chapter, page).
4. **Transparent Verification Hub**: Audits embedded QR codes, checks X.509 Digital Signature Certificates (DSC), and maintains honest statuses for government authority gateways.
5. **Cure & Rectification Workflow**: Standardized discrepancy notices with strict deadlines and audit tracking.
6. **Immutable Cryptographic Audit Trail**: Every upload, manual OCR field correction, and evaluation decision is immutably logged with actor identities, timestamps, and change diffs.

---

## ⚖️ Core Integrity & Transparent Status Disclosure

Pramaan AI operates under an uncompromised honesty and decision-support policy:
- **`extraction_uncertain`**: Displayed whenever OCR confidence falls below the strict threshold (default 70%). Never pretends to guess indistinct scans.
- **`verification_pending`**: Assigned when documents await evaluation or automated pipeline triggers.
- **`source_unavailable`**: Transparently logged when external state registries (e.g., Bhulekh, IGR, Fire Directorate) do not provide open API endpoints. We never simulate dummy success.
- **`manual_review_required`**: Clearly flags edge cases that demand physical or human scrutiny by authorized AICTE officials.

---

## 🏗️ System Architecture

```
Pramaan AI
├── backend/            Node.js (v18+) + Express + MongoDB (Mongoose)
│   ├── config/         Database connection, environment constants
│   ├── models/         17 Mongoose models (Applications, Documents, Findings, etc.)
│   ├── routes/         Express routers (Auth, Dashboard, Applications, Documents, Regulatory, Admin)
│   ├── controllers/    Scrutiny logic, validation orchestration, audit events
│   ├── middleware/     JWT Auth, RBAC guards, multer file upload protection
│   └── scripts/        CLI administrator seed script (seedAdmin.js)
│
├── frontend/           React 19 + Vite 8 + Tailwind CSS + Lucide Icons + Recharts
│   ├── src/pages/      13 interactive functional pages (Dashboard, Applications, Dossier, RAG, etc.)
│   ├── src/components/ Responsive sidebar, status helpers, modals, layouts
│   ├── src/contexts/   JWT session management (AuthContext)
│   └── src/api/        Axios client with automatic token attachment
│
└── processor/          Python 3.10+ FastAPI microservice
    ├── ocr.py          PDF text extraction, Tesseract OCR fallback, QR decoder
    ├── extractor.py    Deterministic regex field parsing with confidence scoring
    ├── classifier.py   Explainable keyword document classifier
    └── rag/            ChromaDB vector embedding & semantic citation engine
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18.0 or higher)
- **npm** (v9.0 or higher)
- **Python** (v3.10 or higher)
- **MongoDB** running locally on `mongodb://localhost:27017` or MongoDB Atlas URI

---

### Step 1: Start the Backend API

```powershell
cd d:\PramaanAI\backend
npm install
```

Configure your environment variables in `backend/.env` (or copy from `.env.example`):
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/pramaan_ai
JWT_SECRET=pramaan_jwt_secret_dev_key_2026_sih
PROCESSOR_URL=http://localhost:8000
```

Seed the default System Administrator account:
```powershell
node scripts/seedAdmin.js
```
*(Default credentials: `admin@pramaan.aicte.gov.in` / `Admin@12345`)*

Start the backend server:
```powershell
npm run dev
# Running on http://localhost:5000
```

---

### Step 2: Start the Python Processing Service

```powershell
cd d:\PramaanAI\processor
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
# Running on http://localhost:8000
```

---

### Step 3: Start the Frontend Application

```powershell
cd d:\PramaanAI\frontend
npm run dev
# Access the web application at http://localhost:5173
```

---

## 💻 User Roles & Access Control (RBAC)

1. **System Administrator (`admin`)**:
   - Access to Rule Engine configuration (`/admin/rules`)
   - User management & RBAC role reassignment (`/admin/users`)
   - Full dossier evaluation, creation, and audit trail inspection.

2. **Scrutiny Officer (`scrutiny_officer`)**:
   - Scrutiny evaluation of application dossiers.
   - Issuing official Rectification notices with deadlines.
   - Manual review verification and field correction overrides.

3. **AICTE Evaluator (`evaluator`)**:
   - Running the cross-document compliance engine.
   - Inspecting findings, confidence scores, and DSC/QR evidence.

4. **Institution Representative (`institution_user`)**:
   - Creating approval applications (EoA, New Institution, Intake Increase).
   - Uploading required regulatory documents (Land Deeds, NOCs, Affidavits).
   - Responding to rectification requests.

---

## 🛡️ License & Compliance Disclaimer

*Pramaan AI is developed for the Smart India Hackathon (AICTE Track).*  
*All regulatory checks, scores, and discrepancy alerts are strictly assistive and decision-supportive. Final regulatory sanctions are made exclusively by authorized AICTE regional committees.*
