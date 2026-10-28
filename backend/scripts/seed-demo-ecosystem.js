require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Models
const User = require('../src/models/User');
const Institution = require('../src/models/Institution');
const Application = require('../src/models/Application');
const ApplicationCategory = require('../src/models/ApplicationCategory');
const Checklist = require('../src/models/Checklist');
const ValidationRule = require('../src/models/ValidationRule');
const Document = require('../src/models/Document');
const ExtractedField = require('../src/models/ExtractedField');
const Finding = require('../src/models/Finding');
const ValidationRun = require('../src/models/ValidationRun');
const Rectification = require('../src/models/Rectification');
const VerificationRecord = require('../src/models/VerificationRecord');
const AuditEvent = require('../src/models/AuditEvent');
const Notification = require('../src/models/Notification');

// Calculate file SHA-256
function sha256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

// Copy file to uploads
function copyToUploads(sourcePath, filename) {
  const destDir = path.join(__dirname, '../uploads/documents');
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  const destPath = path.join(destDir, filename);
  fs.copyFileSync(sourcePath, destPath);
  return destPath;
}

const DEMO_CATEGORIES = [
  { code: 'EOA', name: 'Extension of Approval (EoA)', description: 'Annual extension of approval for existing institutions' },
  { code: 'NEW_INST', name: 'Establishment of New Institution', description: 'Approval for setting up a new technical institution' },
  { code: 'INC_INTAKE', name: 'Increase in Intake / Additional Course', description: 'Expansion of intake capacity or addition of new course/programme' },
  { code: 'NEW_COURSE', name: 'Introduction of New Course / Division', description: 'Introduction of emerging area course or new division' },
  { code: 'CLOSURE', name: 'Closure of Course / Institution', description: 'Progressive or complete closure of course or institution' },
];

const STANDARD_CHECKLIST_ITEMS = [
  { ruleId: 'CHK-LAND-01', ruleVersion: '1.0.0', title: 'Land Title Deed / Ownership / Lease Documents', description: 'Registered sale deed / lease deed min 30 years in name of Trust/Society', isRequired: true, documentTypes: ['land_title_deed'], order: 1 },
  { ruleId: 'CHK-BLD-01', ruleVersion: '1.0.0', title: 'Approved Building Plan (PWD/Competent Authority)', description: 'Master plan and building plan approved by local planning authority or town planner', isRequired: true, documentTypes: ['building_plan_approval'], order: 2 },
  { ruleId: 'CHK-OCC-01', ruleVersion: '1.0.0', title: 'Occupancy / Completion Certificate', description: 'Building completion or occupancy certificate from municipal authority', isRequired: true, documentTypes: ['occupancy_certificate'], order: 3 },
  { ruleId: 'CHK-FIRE-01', ruleVersion: '1.0.0', title: 'Fire Safety Certificate / NOC', description: 'Valid Fire Safety NOC issued by Chief Fire Officer or State Fire Agency', isRequired: true, documentTypes: ['fire_safety_noc'], order: 4 },
  { ruleId: 'CHK-STR-01', ruleVersion: '1.0.0', title: 'Structural Stability Certificate', description: 'Structural stability certificate signed by certified structural engineer', isRequired: true, documentTypes: ['structural_stability'], order: 5 },
  { ruleId: 'CHK-SOC-01', ruleVersion: '1.0.0', title: 'Society / Trust / Company Registration', description: 'Registration certificate and Memorandum of Association of Trust or Society', isRequired: true, documentTypes: ['society_trust_registration'], order: 6 },
  { ruleId: 'CHK-FAC-01', ruleVersion: '1.0.0', title: 'Faculty List & Cadre Ratio Document', description: 'Sanctioned faculty rolls, cadre ratio 1:2:6 compliance, and qualification certificates', isRequired: true, documentTypes: ['faculty_cadre_ratio'], order: 7 },
  { ruleId: 'CHK-SAL-01', ruleVersion: '1.0.0', title: 'Faculty Salary Bank Statements', description: 'Bank statements showing electronic fund transfer of salary payments to faculty accounts', isRequired: true, documentTypes: ['salary_bank_statement'], order: 8 },
  { ruleId: 'CHK-AFF-01', ruleVersion: '1.0.0', title: 'Affidavit for Regulatory Compliance', description: 'Notarized institutional compliance affidavit on stamp paper', isRequired: true, documentTypes: ['affidavit_compliance'], order: 9 },
];

async function seedEcosystem() {
  const uri = process.env.MONGO_URI.includes('PramaanAI')
    ? process.env.MONGO_URI
    : `${process.env.MONGO_URI}/PramaanAI`;
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  // Clear existing working collections to ensure pristine state
  await Promise.all([
    Application.deleteMany({}),
    Document.deleteMany({}),
    ExtractedField.deleteMany({}),
    Finding.deleteMany({}),
    ValidationRun.deleteMany({}),
    Rectification.deleteMany({}),
    VerificationRecord.deleteMany({}),
    AuditEvent.deleteMany({}),
    Notification.deleteMany({}),
    Institution.deleteMany({}),
  ]);
  console.log('Cleaned old records');

  // 1. Categories
  const categories = {};
  for (const c of DEMO_CATEGORIES) {
    let cat = await ApplicationCategory.findOne({ code: c.code });
    if (!cat) {
      cat = await ApplicationCategory.create(c);
    }
    categories[c.code] = cat;
  }

  // 2. Checklists
  for (const [code, cat] of Object.entries(categories)) {
    for (const year of ['2026-2027', '2025-2026']) {
      let chk = await Checklist.findOne({ category: cat._id, academicYear: year });
      if (!chk) {
        await Checklist.create({
          category: cat._id,
          academicYear: year,
          version: '1.0.0',
          items: STANDARD_CHECKLIST_ITEMS,
          isActive: true,
        });
      }
    }
  }

  // 3. Institutions
  const instNorthstar = await Institution.create({
    name: 'Northstar Institute of Engineering & Applied Sciences',
    aicteId: '1-5831-2026',
    address: {
      street: 'Plot 18, Knowledge Park, Phase II',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411057',
    },
    type: 'college',
    contactEmail: 'principal@northstar.edu.in',
    contactPhone: '+91 20 6712 4000',
    isVerified: true,
  });

  const instVIT = await Institution.create({
    name: 'Vishwakarma Institute of Technology (VIT)',
    aicteId: '1-4019283',
    address: {
      street: '666 Upper Indiranagar, Bibwewadi',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411037',
    },
    type: 'college',
    contactEmail: 'director@vit.edu.in',
    contactPhone: '+91 20 2420 2180',
    isVerified: true,
  });

  const instDelhi = await Institution.create({
    name: 'Delhi Institute of Advanced Technology & Research',
    aicteId: '1-8829103',
    address: {
      street: 'Bawana Road, Shahbad Daulatpur',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110042',
    },
    type: 'college',
    contactEmail: 'registrar@delhitech.edu.in',
    contactPhone: '+91 11 2787 1018',
    isVerified: true,
  });

  const instApex = await Institution.create({
    name: 'Apex Global Institute of Management & Technology',
    aicteId: '1-7712093',
    address: {
      street: '124 Electronic City Phase 1, Hosur Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560100',
    },
    type: 'college',
    contactEmail: 'contact@apex-institute.ac.in',
    contactPhone: '+91 80 4123 9000',
    isVerified: true,
  });

  const instSomaiya = await Institution.create({
    name: 'K.J. Somaiya College of Engineering',
    aicteId: '1-9920194',
    address: {
      street: 'Vidyanagar, Vidyavihar East',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400077',
    },
    type: 'college',
    contactEmail: 'principal@somaiya.edu.in',
    contactPhone: '+91 22 6644 9191',
    isVerified: true,
  });

  // 4. Users (Personas)
  // Admin
  let admin = await User.findOne({ email: 'admin@pramaanai.local' });
  if (admin) {
    admin.name = 'Dr. Rajesh Sharma (AICTE Admin)';
    admin.role = 'admin';
    admin.institution = instNorthstar._id;
    await admin.save({ validateBeforeSave: false });
  } else {
    admin = await User.create({
      name: 'Dr. Rajesh Sharma (AICTE Admin)',
      email: 'admin@pramaanai.local',
      password: process.env.ADMIN_PASSWORD || 'Admin@123',
      role: 'admin',
      institution: instNorthstar._id,
    });
  }

  // Reviewer / Scrutiny Officer
  let reviewer = await User.findOne({ email: 'reviewer@pramaanai.local' });
  if (!reviewer) {
    reviewer = await User.create({
      name: 'Prof. Sneha Deshmukh (Senior Scrutiny Officer)',
      email: 'reviewer@pramaanai.local',
      password: 'Reviewer@123',
      role: 'reviewer',
    });
  }

  // College User 1: Northstar Nodal Officer
  let principalNorthstar = await User.findOne({ email: 'principal@northstar.edu.in' });
  if (!principalNorthstar) {
    principalNorthstar = await User.create({
      name: 'Dr. Anand Kulkarni (Principal, Northstar)',
      email: 'principal@northstar.edu.in',
      password: 'College@123',
      role: 'institution_user',
      institution: instNorthstar._id,
    });
  }

  // College User 2: VIT Director
  let directorVIT = await User.findOne({ email: 'director@vit.edu.in' });
  if (!directorVIT) {
    directorVIT = await User.create({
      name: 'Dr. P. V. Kulkarni (Director, VIT Pune)',
      email: 'director@vit.edu.in',
      password: 'College@123',
      role: 'institution_user',
      institution: instVIT._id,
    });
  }

  // College User 3: Delhi Tech Registrar
  let registrarDelhi = await User.findOne({ email: 'registrar@delhitech.edu.in' });
  if (!registrarDelhi) {
    registrarDelhi = await User.create({
      name: 'Prof. R. C. Mathur (Registrar, Delhi Tech)',
      email: 'registrar@delhitech.edu.in',
      password: 'College@123',
      role: 'institution_user',
      institution: instDelhi._id,
    });
  }

  // College User 4: Somaiya Principal
  let principalSomaiya = await User.findOne({ email: 'principal@somaiya.edu.in' });
  if (!principalSomaiya) {
    principalSomaiya = await User.create({
      name: 'Dr. Shubha Pandit (Principal, Somaiya)',
      email: 'principal@somaiya.edu.in',
      password: 'College@123',
      role: 'institution_user',
      institution: instSomaiya._id,
    });
  }

  console.log('Users & Institutions seeded');

  // ==========================================
  // APPLICATION 1: Northstar Institute (The Main Test Pack Fixture)
  // ==========================================
  const demoDocsDir = path.join(__dirname, '../../demo_docs');
  const app1 = await Application.create({
    applicationNumber: 'PRM-2026-00014',
    institution: instNorthstar._id,
    submittedBy: principalNorthstar._id,
    assignedReviewer: reviewer._id,
    category: categories['NEW_COURSE']._id,
    academicYear: '2026-2027',
    applicationType: 'new_course',
    status: 'under_review',
    checklistVersion: '1.0.0',
    submittedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
    institutionDetails: {
      name: instNorthstar.name,
      aictePermanentId: 'SYN-INST-5831',
      address: instNorthstar.address.street,
      state: instNorthstar.address.state,
      district: instNorthstar.address.city,
    },
    contactPerson: {
      name: 'Sample Contact A',
      designation: 'Institutional Nodal Officer',
      email: 'admin@northstar.example.invalid',
      phone: '+91 98220 12345',
    },
    programmes: ['B.Tech in Computer Engineering (Intake: 120)'],
  });

  // Attach real files from demo_docs
  const docFiles = [
    { src: '01_application_form.pdf', type: 'affidavit_compliance', name: 'Institutional Application Form.pdf', rule: 'CHK-AFF-01' },
    { src: '02_permission_record.pdf', type: 'affidavit_compliance', name: 'Institutional Permission Record.pdf', rule: 'CHK-AFF-01' },
    { src: '03_facility_certificate.pdf', type: 'occupancy_certificate', name: 'Facility Certification Record.pdf', rule: 'CHK-OCC-01' },
    { src: '04_institutional_undertaking.pdf', type: 'society_trust_registration', name: 'Institutional Undertaking.pdf', rule: 'CHK-SOC-01' },
    { src: '05_faculty_statement.pdf', type: 'faculty_cadre_ratio', name: 'Faculty Details Statement.pdf', rule: 'CHK-FAC-01' },
    { src: '06_faculty_details_addendum.pdf', type: 'salary_bank_statement', name: 'Faculty Salary & Bank Details Addendum.pdf', rule: 'CHK-SAL-01' },
    { src: '07_infrastructure_evidence_register.pdf', type: 'building_plan_approval', name: 'Campus Infrastructure Evidence Register.pdf', rule: 'CHK-BLD-01' },
    { src: '08_laboratory_illustration.png', type: 'other', name: 'Computer Architecture Laboratory Geo-Proof.png', rule: 'CHK-LAND-01' },
  ];

  const app1Docs = [];
  for (const f of docFiles) {
    const srcPath = path.join(demoDocsDir, f.src);
    if (fs.existsSync(srcPath)) {
      const storedName = `${Date.now()}-${f.src}`;
      const destPath = copyToUploads(srcPath, storedName);
      const hash = sha256(destPath);
      const stat = fs.statSync(destPath);

      const d = await Document.create({
        application: app1._id,
        uploadedBy: principalNorthstar._id,
        documentType: f.type,
        originalFilename: f.name,
        storedFilename: storedName,
        storagePath: destPath,
        mimeType: f.src.endsWith('.pdf') ? 'application/pdf' : 'image/png',
        sizeBytes: stat.size,
        sha256Hash: hash,
        uploadStatus: 'stored',
        processingStatus: 'completed',
        checklistItemRuleId: f.rule,
      });
      app1Docs.push(d);
    }
  }

  // Create Extracted Fields for App 1
  if (app1Docs[0]) {
    await ExtractedField.create({
      document: app1Docs[0]._id,
      application: app1._id,
      fieldName: 'institution_id',
      extractedValue: 'SYN-INST-5831',
      confidence: 0.98,
      extractionMethod: 'pdf_text',
      status: 'extracted',
      pageReference: 'Page 1, Table A',
    });
    await ExtractedField.create({
      document: app1Docs[0]._id,
      application: app1._id,
      fieldName: 'programme_title',
      extractedValue: 'B.Tech in Computer Engineering',
      confidence: 0.96,
      extractionMethod: 'pdf_text',
      status: 'extracted',
      pageReference: 'Page 1, Table B',
    });
    await ExtractedField.create({
      document: app1Docs[0]._id,
      application: app1._id,
      fieldName: 'proposed_intake',
      extractedValue: 120,
      confidence: 0.99,
      extractionMethod: 'pdf_text',
      status: 'extracted',
      pageReference: 'Page 1, Table B',
    });
  }

  if (app1Docs[1]) {
    // Transposed identifier in Permission Record!
    await ExtractedField.create({
      document: app1Docs[1]._id,
      application: app1._id,
      fieldName: 'institution_id',
      extractedValue: 'SYN-INST-5381',
      confidence: 0.97,
      extractionMethod: 'pdf_text',
      status: 'extracted',
      pageReference: 'Page 1, Header Particulars',
    });
  }

  // Create Validation Run & Findings for App 1
  const vRun1 = await ValidationRun.create({
    application: app1._id,
    triggeredBy: reviewer._id,
    triggerReason: 'manual_trigger',
    status: 'completed',
    completedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
    findingsCount: { critical: 0, major: 1, minor: 1, info: 0 },
    rulesApplied: [
      { ruleId: 'CON-001', ruleVersion: '1.0.0', ruleName: 'Institutional Permanent Identifier Consistency' },
      { ruleId: 'COMP-001', ruleVersion: '1.0.0', ruleName: 'Mandatory Regulatory Document Completeness' },
      { ruleId: 'EXP-001', ruleVersion: '1.0.0', ruleName: 'Regulatory Document Validity & Expiry Check' },
    ],
  });

  await Finding.create({
    application: app1._id,
    validationRun: vRun1._id,
    document: app1Docs[1]?._id,
    checkName: 'Institution ID Inconsistency (Transposition Anomaly)',
    ruleId: 'CON-001',
    ruleVersion: '1.0.0',
    findingType: 'mismatch',
    severity: 'major',
    status: 'open',
    explanation: 'Cross-document inconsistency detected: Application Form specifies institution identifier "SYN-INST-5831" while Permission Record specifies "SYN-INST-5381". Transposition of digits requires confirmation before approval.',
    expectedValue: 'SYN-INST-5831 (Uniform Identifier)',
    observedValue: 'SYN-INST-5831 vs SYN-INST-5381',
    evidenceReference: '01_application_form.pdf (p.1) vs 02_permission_record.pdf (p.1)',
    suggestedAction: 'Request institutional clarification / rectified permission record confirming the correct AICTE permanent identifier.',
    requiresHumanReview: true,
  });

  await Finding.create({
    application: app1._id,
    validationRun: vRun1._id,
    document: app1Docs[4]?._id,
    checkName: 'Faculty Cadre Ratio Verification',
    ruleId: 'FAC-001',
    ruleVersion: '1.0.0',
    findingType: 'extraction_uncertain',
    severity: 'minor',
    status: 'open',
    explanation: 'Faculty list cadre ratio 1:2:6 compliance confirmed. 1 Professor, 2 Associate Professors, 6 Assistant Professors declared for 120 intake.',
    expectedValue: 'Cadre ratio 1:2:6',
    observedValue: 'Compliant with cadre distribution',
    evidenceReference: '05_faculty_statement.pdf (p.1)',
    suggestedAction: 'Verify salary disbursement entries in addendum prior to final issuance.',
    requiresHumanReview: false,
  });

  // Verification record for App 1
  if (app1Docs[0]) {
    await VerificationRecord.create({
      document: app1Docs[0]._id,
      application: app1._id,
      verificationMethod: 'digital_signature',
      issuerName: 'National Informatics Centre (NIC) / CCA India',
      status: 'verified',
      result: { valid: true, algorithm: 'SHA256withRSA', signer: 'Dr. Anand Kulkarni', timestamp: new Date() },
      evidenceReference: 'X.509 Certificate Chain Validated against CCA Trust Store',
      sourceConfirmed: true,
      verifiedBy: reviewer._id,
      verifiedAt: new Date(),
    });
  }

  // ==========================================
  // APPLICATION 2: Vishwakarma Institute of Technology (VIT Pune)
  // Scenario: Critical Land Area Discrepancy (4.25 Acres vs 5.10 Acres)
  // ==========================================
  const app2 = await Application.create({
    applicationNumber: 'PRM-2026-00021',
    institution: instVIT._id,
    submittedBy: directorVIT._id,
    assignedReviewer: reviewer._id,
    category: categories['EOA']._id,
    academicYear: '2026-2027',
    applicationType: 'extension_of_approval',
    status: 'under_review',
    checklistVersion: '1.0.0',
    submittedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
    institutionDetails: {
      name: instVIT.name,
      aictePermanentId: instVIT.aicteId,
      address: instVIT.address.street,
      state: instVIT.address.state,
      district: instVIT.address.city,
    },
    programmes: ['Engineering & Technology (UG/PG)', 'Computer Applications (MCA)'],
  });

  // Attach mock docs for App 2
  const docTitleDeed = await Document.create({
    application: app2._id,
    uploadedBy: directorVIT._id,
    documentType: 'land_title_deed',
    originalFilename: 'Registered_Sale_Deed_Parcel_666.pdf',
    storedFilename: `${Date.now()}-Registered_Sale_Deed.pdf`,
    storagePath: path.join(__dirname, '../../demo_docs/01_application_form.pdf'),
    mimeType: 'application/pdf',
    sizeBytes: 1048576,
    sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    uploadStatus: 'stored',
    processingStatus: 'completed',
    checklistItemRuleId: 'CHK-LAND-01',
  });

  const docBuildingPlan = await Document.create({
    application: app2._id,
    uploadedBy: directorVIT._id,
    documentType: 'building_plan_approval',
    originalFilename: 'PMC_Approved_Master_Building_Plan_Sanction.pdf',
    storedFilename: `${Date.now()}-Master_Building_Plan.pdf`,
    storagePath: path.join(__dirname, '../../demo_docs/07_infrastructure_evidence_register.pdf'),
    mimeType: 'application/pdf',
    sizeBytes: 2097152,
    sha256Hash: 'f4c8996fb92427ae41e4649b934ca495991b7852b855e3b0c44298fc1c149afb',
    uploadStatus: 'stored',
    processingStatus: 'completed',
    checklistItemRuleId: 'CHK-BLD-01',
  });

  await ExtractedField.create({
    document: docTitleDeed._id,
    application: app2._id,
    fieldName: 'land_area_acres',
    extractedValue: '4.25',
    confidence: 0.98,
    extractionMethod: 'pdf_text',
    status: 'extracted',
    pageReference: 'Schedule A, Para 4',
  });

  await ExtractedField.create({
    document: docBuildingPlan._id,
    application: app2._id,
    fieldName: 'land_area_acres',
    extractedValue: '5.10',
    confidence: 0.95,
    extractionMethod: 'pdf_text',
    status: 'extracted',
    pageReference: 'Site Layout Plan Sheet 1',
  });

  const vRun2 = await ValidationRun.create({
    application: app2._id,
    triggeredBy: reviewer._id,
    triggerReason: 'manual_trigger',
    status: 'completed',
    completedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000),
    findingsCount: { critical: 1, major: 0, minor: 0, info: 0 },
    rulesApplied: [
      { ruleId: 'LAND-001', ruleVersion: '1.0.0', ruleName: 'Cross-Document Land Acreage Verification' },
    ],
  });

  const findingLand = await Finding.create({
    application: app2._id,
    validationRun: vRun2._id,
    document: docTitleDeed._id,
    checkName: 'Cross-Document Land Acreage Mismatch (20.0% Discrepancy)',
    ruleId: 'LAND-001',
    ruleVersion: '1.0.0',
    findingType: 'mismatch',
    severity: 'critical',
    status: 'open',
    explanation: 'Critical regulatory discrepancy: Registered Sale Deed specifies land area of 4.25 Acres while the PMC Approved Building Plan specifies 5.10 Acres. Discrepancy ratio of 20.0% exceeds the permissible 5.0% tolerance in AICTE Approval Process Handbook Chapter II.',
    expectedValue: 'Consistent acreage across title and sanctions (<= 5% variance)',
    observedValue: 'Registered Sale Deed: 4.25 acres vs Approved Building Plan: 5.10 acres',
    evidenceReference: 'Deed Schedule A vs Master Plan Sheet 1',
    suggestedAction: 'Issue immediate Rectification Notice requiring institution to submit demarcation certificate issued by Tehsildar / Competent Revenue Authority.',
    requiresHumanReview: true,
  });

  // Create Rectification Notice for App 2
  await Rectification.create({
    application: app2._id,
    finding: findingLand._id,
    requestedBy: reviewer._id,
    requestNote: 'Please provide revenue authority demarcation certificate clarifying the discrepancy of 0.85 acres between the Registered Sale Deed (4.25 acres) and the Municipal Sanctioned Building Plan (5.10 acres).',
    status: 'requested',
  });

  // ==========================================
  // APPLICATION 3: Delhi Institute of Technology
  // Scenario: Expired Statutory Fire Safety NOC
  // ==========================================
  const app3 = await Application.create({
    applicationNumber: 'PRM-2026-00035',
    institution: instDelhi._id,
    submittedBy: registrarDelhi._id,
    assignedReviewer: reviewer._id,
    category: categories['INC_INTAKE']._id,
    academicYear: '2026-2027',
    applicationType: 'increase_in_intake',
    status: 'rectification_requested',
    checklistVersion: '1.0.0',
    submittedAt: new Date(Date.now() - 6 * 24 * 3600 * 1000),
    institutionDetails: {
      name: instDelhi.name,
      aictePermanentId: instDelhi.aicteId,
      address: instDelhi.address.street,
      state: instDelhi.address.state,
      district: instDelhi.address.city,
    },
    programmes: ['Artificial Intelligence & Data Science (Additional 60 seats)'],
  });

  const docFireNOC = await Document.create({
    application: app3._id,
    uploadedBy: registrarDelhi._id,
    documentType: 'fire_safety_noc',
    originalFilename: 'Delhi_Fire_Service_NOC_Renewal.pdf',
    storedFilename: `${Date.now()}-Fire_Service_NOC.pdf`,
    storagePath: path.join(__dirname, '../../demo_docs/03_facility_certificate.pdf'),
    mimeType: 'application/pdf',
    sizeBytes: 819200,
    sha256Hash: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
    uploadStatus: 'stored',
    processingStatus: 'completed',
    checklistItemRuleId: 'CHK-FIRE-01',
  });

  await ExtractedField.create({
    document: docFireNOC._id,
    application: app3._id,
    fieldName: 'expiry_date',
    extractedValue: '2026-05-15',
    confidence: 0.99,
    extractionMethod: 'pdf_text',
    status: 'extracted',
    pageReference: 'Page 1, Clause 3',
  });

  const vRun3 = await ValidationRun.create({
    application: app3._id,
    triggeredBy: reviewer._id,
    triggerReason: 'manual_trigger',
    status: 'completed',
    completedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
    findingsCount: { critical: 1, major: 0, minor: 0, info: 0 },
    rulesApplied: [
      { ruleId: 'EXP-001', ruleVersion: '1.0.0', ruleName: 'Regulatory Document Validity & Expiry Check' },
    ],
  });

  const findingFire = await Finding.create({
    application: app3._id,
    validationRun: vRun3._id,
    document: docFireNOC._id,
    checkName: 'Statutory Clearance Expired (Fire Safety Certificate)',
    ruleId: 'EXP-001',
    ruleVersion: '1.0.0',
    findingType: 'expired',
    severity: 'critical',
    status: 'open',
    explanation: 'Statutory compliance violation: Delhi Fire Service NOC expired on 15 May 2026. Under AICTE Approval Process Handbook Norms, institutions cannot be granted Intake Increase without an unexpired and valid Fire Safety NOC.',
    expectedValue: 'Valid NOC through 31 July 2027',
    observedValue: 'Expired on 15 May 2026 (Past validity)',
    evidenceReference: 'Delhi Fire Service NOC Cert #DFS/HQ/2023/1029, Page 1',
    suggestedAction: 'Upload valid renewal application or current Fire Safety Certificate issued by competent authority.',
    requiresHumanReview: true,
  });

  await Rectification.create({
    application: app3._id,
    finding: findingFire._id,
    requestedBy: reviewer._id,
    requestNote: 'The submitted Fire Safety NOC expired on May 15, 2026. Please upload an active renewal certificate or the official receipt of the renewal inspection from Delhi Fire Service.',
    status: 'requested',
  });

  // ==========================================
  // APPLICATION 4: Apex Global Institute
  // Scenario: Duplicate / Plagiarized Geotagged Evidence
  // ==========================================
  const app4 = await Application.create({
    applicationNumber: 'PRM-2026-00042',
    institution: instApex._id,
    submittedBy: reviewer._id,
    assignedReviewer: reviewer._id,
    category: categories['EOA']._id,
    academicYear: '2026-2027',
    applicationType: 'extension_of_approval',
    status: 'under_review',
    checklistVersion: '1.0.0',
    submittedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
    institutionDetails: {
      name: instApex.name,
      aictePermanentId: instApex.aicteId,
      address: instApex.address.street,
      state: instApex.address.state,
      district: instApex.address.city,
    },
    programmes: ['Management (MBA/PGDM)'],
  });

  // Attach the duplicate image from demo_docs (09_laboratory_illustration_duplicate.png)
  const dupImgSrc = path.join(demoDocsDir, '09_laboratory_illustration_duplicate.png');
  let docApexDup = null;
  if (fs.existsSync(dupImgSrc)) {
    const storedName = `${Date.now()}-09_laboratory_illustration_duplicate.png`;
    const destPath = copyToUploads(dupImgSrc, storedName);
    const hash = sha256(destPath); // Exactly matches 08_laboratory_illustration.png!
    const stat = fs.statSync(destPath);

    docApexDup = await Document.create({
      application: app4._id,
      uploadedBy: reviewer._id,
      documentType: 'other',
      originalFilename: 'Advanced_Computing_Lab_Photo.png',
      storedFilename: storedName,
      storagePath: destPath,
      mimeType: 'image/png',
      sizeBytes: stat.size,
      sha256Hash: hash,
      uploadStatus: 'stored',
      processingStatus: 'completed',
      checklistItemRuleId: 'CHK-LAND-01',
    });

    const vRun4 = await ValidationRun.create({
      application: app4._id,
      triggeredBy: reviewer._id,
      triggerReason: 'manual_trigger',
      status: 'completed',
      completedAt: new Date(),
      findingsCount: { critical: 0, major: 1, minor: 0, info: 0 },
      rulesApplied: [
        { ruleId: 'DUP-001', ruleVersion: '1.0.0', ruleName: 'Cryptographic Document Duplicate Detection' },
      ],
    });

    await Finding.create({
      application: app4._id,
      validationRun: vRun4._id,
      document: docApexDup._id,
      checkName: 'Cross-Institution Duplicate Evidence Detected',
      ruleId: 'DUP-001',
      ruleVersion: '1.0.0',
      findingType: 'duplicate',
      severity: 'major',
      status: 'open',
      explanation: `Byte-identical cryptographic SHA-256 match (${hash.substring(0, 16)}...) detected across distinct institutions! This exact photograph was also submitted by Northstar Institute of Engineering (Application PRM-2026-00014). Potential stock photo or evidence falsification.`,
      expectedValue: 'Original institutional geotagged photograph unique to campus premises',
      observedValue: `Duplicate of image in PRM-2026-00014 (Northstar Institute)`,
      evidenceReference: `SHA-256 Hash: ${hash}`,
      suggestedAction: 'Refer to Expert Visiting Committee (EVC) for unannounced physical campus inspection.',
      requiresHumanReview: true,
    });
  }

  // ==========================================
  // APPLICATION 5: K.J. Somaiya College of Engineering
  // Scenario: 100% Verified, Clean Regulatory Pass!
  // ==========================================
  const app5 = await Application.create({
    applicationNumber: 'PRM-2026-00050',
    institution: instSomaiya._id,
    submittedBy: principalSomaiya._id,
    assignedReviewer: reviewer._id,
    category: categories['EOA']._id,
    academicYear: '2026-2027',
    applicationType: 'extension_of_approval',
    status: 'approved',
    checklistVersion: '1.0.0',
    submittedAt: new Date(Date.now() - 10 * 24 * 3600 * 1000),
    institutionDetails: {
      name: instSomaiya.name,
      aictePermanentId: instSomaiya.aicteId,
      address: instSomaiya.address.street,
      state: instSomaiya.address.state,
      district: instSomaiya.address.city,
    },
    programmes: ['Mechanical Engineering', 'Electronics & Telecommunication', 'Information Technology'],
  });

  // Attach 9 compliant documents for Somaiya
  for (const item of STANDARD_CHECKLIST_ITEMS) {
    const dummyHash = crypto.createHash('sha256').update(`somaiya-${item.ruleId}`).digest('hex');
    const docS = await Document.create({
      application: app5._id,
      uploadedBy: principalSomaiya._id,
      documentType: item.documentTypes[0],
      originalFilename: `${item.title.replace(/[^a-zA-Z0-9]/g, '_')}_Signed.pdf`,
      storedFilename: `${Date.now()}-Somaiya_${item.ruleId}.pdf`,
      storagePath: path.join(__dirname, '../../demo_docs/04_institutional_undertaking.pdf'),
      mimeType: 'application/pdf',
      sizeBytes: 1540000,
      sha256Hash: dummyHash,
      uploadStatus: 'stored',
      processingStatus: 'completed',
      checklistItemRuleId: item.ruleId,
    });

    await VerificationRecord.create({
      document: docS._id,
      application: app5._id,
      verificationMethod: 'qr_decode',
      issuerName: 'National Academic Depository / State Directorate',
      status: 'verified',
      result: { valid: true, timestamp: new Date() },
      evidenceReference: `Official gateway QR verification verified for ${item.title}`,
      sourceConfirmed: true,
      verifiedBy: reviewer._id,
      verifiedAt: new Date(),
    });
  }

  // Create notifications for users
  await Notification.create({
    recipient: reviewer._id,
    type: 'rectification_requested',
    application: app2._id,
    title: 'Urgent: Land Acreage Discrepancy Flagged',
    message: 'VIT Pune (PRM-2026-00021) has a 20% land discrepancy between Registered Deed and Building Plan.',
    isRead: false,
  });

  await Notification.create({
    recipient: reviewer._id,
    type: 'rectification_requested',
    application: app3._id,
    title: 'Statutory NOC Expired Alert',
    message: 'Delhi Institute of Technology (PRM-2026-00035) Fire NOC expired. Rectification notice pending response.',
    isRead: false,
  });

  await Notification.create({
    recipient: principalNorthstar._id,
    type: 'review_assigned',
    application: app1._id,
    title: 'Application Received & Preliminary Scrutiny Active',
    message: 'Your application for B.Tech in Computer Engineering (PRM-2026-00014) is under active review.',
    isRead: false,
  });

  console.log('Master Demo Ecosystem successfully seeded!');
  console.log('5 Realistic College Applications created with live findings, extractions and verifications.');
  await mongoose.disconnect();
}

seedEcosystem()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seeding error:', err);
    process.exit(1);
  });
