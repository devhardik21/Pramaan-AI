require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Institution = require('../src/models/Institution');
const ApplicationCategory = require('../src/models/ApplicationCategory');
const Checklist = require('../src/models/Checklist');
const ValidationRule = require('../src/models/ValidationRule');

const DEFAULT_CATEGORIES = [
  {
    code: 'EOA',
    name: 'Extension of Approval (EoA)',
    description: 'Annual extension of approval for existing AICTE-approved technical institutions',
    illustrativeOnly: false,
  },
  {
    code: 'NEW_INST',
    name: 'Establishment of New Institution',
    description: 'Approval for establishment of new technical institutions offering diploma/degree programmes',
    illustrativeOnly: false,
  },
  {
    code: 'INC_INTAKE',
    name: 'Increase in Intake / Additional Course',
    description: 'Application for increase in approved student intake capacity or addition of new course/discipline',
    illustrativeOnly: false,
  },
  {
    code: 'NEW_COURSE',
    name: 'Introduction of New Course / Division',
    description: 'Introduction of courses in emerging areas, supernumerary divisions, or integrated programmes',
    illustrativeOnly: false,
  },
  {
    code: 'CLOSURE',
    name: 'Closure of Course / Institution',
    description: 'Application for progressive or complete closure of a programme, course, or entire institution',
    illustrativeOnly: false,
  },
];

const STANDARD_CHECKLIST_ITEMS = [
  {
    ruleId: 'CHK-LAND-01',
    ruleVersion: '1.0.0',
    title: 'Land Title Deed / Ownership / Lease Documents',
    description: 'Registered sale deed / gift deed / government allotment or lease deed (minimum 30 years) in name of Society/Trust.',
    isRequired: true,
    documentTypes: ['land_title_deed'],
    order: 1,
  },
  {
    ruleId: 'CHK-BLD-01',
    ruleVersion: '1.0.0',
    title: 'Approved Building Plan (PWD/Competent Authority)',
    description: 'Master site plan and building construction plan sanctioned by local planning authority or PWD.',
    isRequired: true,
    documentTypes: ['building_plan_approval'],
    order: 2,
  },
  {
    ruleId: 'CHK-OCC-01',
    ruleVersion: '1.0.0',
    title: 'Occupancy / Completion Certificate',
    description: 'Building completion or occupancy certificate issued by municipal body or district development authority.',
    isRequired: true,
    documentTypes: ['occupancy_certificate'],
    order: 3,
  },
  {
    ruleId: 'CHK-FIRE-01',
    ruleVersion: '1.0.0',
    title: 'Fire Safety Certificate / NOC',
    description: 'Valid Fire Safety NOC issued by Chief Fire Officer or State Fire Service authority.',
    isRequired: true,
    documentTypes: ['fire_safety_noc'],
    order: 4,
  },
  {
    ruleId: 'CHK-STR-01',
    ruleVersion: '1.0.0',
    title: 'Structural Stability Certificate',
    description: 'Current structural stability certificate issued and sealed by a licensed structural engineer.',
    isRequired: true,
    documentTypes: ['structural_stability'],
    order: 5,
  },
  {
    ruleId: 'CHK-SOC-01',
    ruleVersion: '1.0.0',
    title: 'Society / Trust / Company Registration',
    description: 'Registration certificate and Memorandum of Association (MoA) under Societies/Trusts/Companies Act.',
    isRequired: true,
    documentTypes: ['society_trust_registration'],
    order: 6,
  },
  {
    ruleId: 'CHK-FAC-01',
    ruleVersion: '1.0.0',
    title: 'Faculty List & Cadre Ratio Document',
    description: 'Sanctioned faculty rolls, designation-wise cadre ratio (1:2:6), and qualifications per AICTE norms.',
    isRequired: true,
    documentTypes: ['faculty_cadre_ratio'],
    order: 7,
  },
  {
    ruleId: 'CHK-SAL-01',
    ruleVersion: '1.0.0',
    title: 'Faculty Salary Bank Statements',
    description: 'Bank passbook statements or disbursement slips certifying electronic bank transfers of faculty salaries.',
    isRequired: true,
    documentTypes: ['salary_bank_statement'],
    order: 8,
  },
  {
    ruleId: 'CHK-AFF-01',
    ruleVersion: '1.0.0',
    title: 'Affidavit for Regulatory Compliance',
    description: 'Notarized institutional affidavit on non-judicial stamp paper confirming compliance with all AICTE norms.',
    isRequired: true,
    documentTypes: ['affidavit_compliance'],
    order: 9,
  },
];

const DEFAULT_VALIDATION_RULES = [
  {
    ruleId: 'COMP-001',
    version: '1.0.0',
    name: 'Mandatory Regulatory Document Completeness',
    description: 'Verifies that every mandatory document required for the application category has been uploaded.',
    validationType: 'completeness',
    severity: 'critical',
    isRequired: true,
    isEnabled: true,
    sourceDocument: 'AICTE Approval Process Handbook',
    sourceSection: 'Chapter II — Submission Requirements',
    illustrativeOnly: false,
  },
  {
    ruleId: 'EXP-001',
    version: '1.0.0',
    name: 'Regulatory Document Validity & Expiry Check',
    description: 'Detects expired validity on fire safety NOCs, lease deeds, or temporary clearance certifications.',
    validationType: 'expiry',
    severity: 'critical',
    isRequired: true,
    isEnabled: true,
    sourceDocument: 'AICTE Approval Process Handbook',
    sourceSection: 'Chapter II — Statutory Clearances',
    illustrativeOnly: false,
  },
  {
    ruleId: 'CON-001',
    version: '1.0.0',
    name: 'Institutional Permanent Identifier Consistency',
    description: 'Ensures the AICTE Permanent ID is uniform across all submitted deeds, plans, and affidavits.',
    validationType: 'identifier_match',
    severity: 'major',
    isRequired: true,
    isEnabled: true,
    sourceDocument: 'AICTE Approval Process Handbook',
    sourceSection: 'General Norms',
    illustrativeOnly: false,
  },
  {
    ruleId: 'LAND-001',
    version: '1.0.0',
    name: 'Cross-Document Land Acreage Verification',
    description: 'Validates that land area mentioned in title deed, building plan, and affidavit is consistent within 5%.',
    validationType: 'cross_document',
    severity: 'critical',
    isRequired: true,
    isEnabled: true,
    sourceDocument: 'AICTE Approval Process Handbook',
    sourceSection: 'Land Requirements',
    illustrativeOnly: false,
  },
  {
    ruleId: 'DUP-001',
    version: '1.0.0',
    name: 'Cryptographic Document Duplicate Detection',
    description: 'Checks SHA-256 fingerprint against other submitted applications to prevent cross-institution plagiarism.',
    validationType: 'duplicate',
    severity: 'major',
    isRequired: true,
    isEnabled: true,
    sourceDocument: 'Pramaan AI Security Engine',
    sourceSection: 'Integrity Protection',
    illustrativeOnly: false,
  },
];

async function seedDefaults() {
  const uri = process.env.MONGO_URI.includes('PramaanAI')
    ? process.env.MONGO_URI
    : `${process.env.MONGO_URI}/PramaanAI`;
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  // 1. Seed or find categories
  const categories = {};
  for (const catData of DEFAULT_CATEGORIES) {
    let cat = await ApplicationCategory.findOne({ code: catData.code });
    if (!cat) {
      cat = await ApplicationCategory.create(catData);
      console.log(`Created Category: ${cat.code} - ${cat.name}`);
    } else {
      console.log(`Category exists: ${cat.code}`);
    }
    categories[cat.code] = cat;
  }

  // 2. Seed default Institution if none exists
  let defaultInst = await Institution.findOne();
  if (!defaultInst) {
    defaultInst = await Institution.create({
      name: 'Pramaan Institute of Technology & Management',
      aicteId: '1-10928374',
      address: {
        street: '42 Knowledge Park III, Institutional Area',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
      },
      type: 'college',
      contactEmail: 'contact@pramaan-institute.ac.in',
      contactPhone: '+91 20 2569 0000',
    });
    console.log(`Created Default Institution: ${defaultInst.name}`);
  }

  // Link admin user to this institution if not linked
  const adminUser = await User.findOne({ role: 'admin' });
  if (adminUser) {
    if (!adminUser.institution) {
      adminUser.institution = defaultInst._id;
      await adminUser.save({ validateBeforeSave: false });
      console.log(`Linked admin user ${adminUser.email} to institution ${defaultInst.name}`);
    }
    if (!defaultInst.members.includes(adminUser._id)) {
      defaultInst.members.push(adminUser._id);
      defaultInst.createdBy = adminUser._id;
      await defaultInst.save();
    }
  }

  // 3. Seed Checklists for each category for academic years
  const academicYears = ['2026-2027', '2025-2026'];
  for (const year of academicYears) {
    for (const [code, cat] of Object.entries(categories)) {
      const existing = await Checklist.findOne({ category: cat._id, academicYear: year, isActive: true });
      if (!existing) {
        await Checklist.create({
          category: cat._id,
          academicYear: year,
          version: '1.0.0',
          items: STANDARD_CHECKLIST_ITEMS,
          isActive: true,
          createdBy: adminUser?._id,
          illustrativeOnly: false,
        });
        console.log(`Created Checklist for ${code} (${year})`);
      }
    }
  }

  // 4. Seed default Validation Rules
  for (const ruleData of DEFAULT_VALIDATION_RULES) {
    const existing = await ValidationRule.findOne({ ruleId: ruleData.ruleId, version: ruleData.version });
    if (!existing) {
      await ValidationRule.create({
        ...ruleData,
        createdBy: adminUser?._id,
      });
      console.log(`Created Validation Rule: ${ruleData.ruleId} - ${ruleData.name}`);
    }
  }

  console.log('Defaults successfully seeded!');
  await mongoose.disconnect();
}

if (require.main === module) {
  seedDefaults()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Failed to seed defaults:', err);
      process.exit(1);
    });
}

module.exports = { seedDefaults, DEFAULT_CATEGORIES, STANDARD_CHECKLIST_ITEMS };
