export type GovernmentJob = {
  id: string;
  title: string;
  agency: string;
  agencyAcronym: string;
  region: string;
  placeOfAssignment: string;
  salaryGrade: number;
  monthlySalary: string;
  itemNumber: string;
  vacancies: number;
  education: string;
  training: string;
  experience: string;
  eligibility: string;
  competency: string;
  deadline: string; // e.g. "Sep 20, 2026"
  isClosingSoon?: boolean; // <= 7 days
  isDeadlineToday?: boolean; // deadline is today
  daysLeft?: number;
  isToday?: boolean;
  isNewToday?: boolean;
  isPostedToday?: boolean; // posted today (within 24h)
  postedTime?: string;
  postedDate: string; // e.g. "Sep 20, 2026"
  documentsNeeded: string[];
  howToApply: {
    addresseeName: string;
    addresseeTitle: string;
    addresseeOffice: string;
    addresseeAddress: string;
    contactEmail: string;
    contactPhone: string;
    portalUrl: string;
  };
  applicationNotes: string;
  skills: string[];
};

export function formatPrettyDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${String(date.getDate()).padStart(2, '0')}, ${date.getFullYear()}`;
}

export function parseDateSafe(val: string): Date {
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date() : d;
}

export function computeDaysLeft(deadlineStr: string, refDate: Date = new Date()): number {
  const d = parseDateSafe(deadlineStr);
  const dMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const rMidnight = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  return Math.round((dMidnight.getTime() - rMidnight.getTime()) / (1000 * 60 * 60 * 24));
}

export function checkIsPostedToday(postedDateStr: string, refDate: Date = new Date()): boolean {
  const p = parseDateSafe(postedDateStr);
  const pMidnight = new Date(p.getFullYear(), p.getMonth(), p.getDate());
  const rMidnight = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  return pMidnight.getTime() === rMidnight.getTime();
}

// 23 Official Agencies in Alphabetical Order
export const PHILIPPINE_AGENCIES = [
  { acronym: 'BIR', name: 'Bureau of Internal Revenue', group: 'Economic & Financial' },
  { acronym: 'BOC', name: 'Bureau of Customs', group: 'Economic & Financial' },
  { acronym: 'CSC', name: 'Civil Service Commission', group: 'Constitutional Body' },
  { acronym: 'DA', name: 'Department of Agriculture', group: 'Commerce, Industry & Agriculture' },
  { acronym: 'DBM', name: 'Department of Budget and Management', group: 'Economic & Financial' },
  { acronym: 'DENR', name: 'Department of Environment and Natural Resources', group: 'Key Departments' },
  { acronym: 'DepEd', name: 'Department of Education', group: 'Social Services, Education & Health' },
  { acronym: 'DFA', name: 'Department of Foreign Affairs', group: 'Diplomacy & External Relations' },
  { acronym: 'DICT', name: 'Department of Information and Communications Technology', group: 'Infrastructure, Utilities & Tech' },
  { acronym: 'DILG', name: 'Department of the Interior and Local Government', group: 'Defense & Public Order' },
  { acronym: 'DMW', name: 'Department of Migrant Workers', group: 'Social Services, Education & Health' },
  { acronym: 'DND', name: 'Department of National Defense', group: 'Defense & Public Order' },
  { acronym: 'DOE', name: 'Department of Energy', group: 'Infrastructure, Utilities & Tech' },
  { acronym: 'DOF', name: 'Department of Finance', group: 'Economic & Financial' },
  { acronym: 'DOH', name: 'Department of Health', group: 'Social Services, Education & Health' },
  { acronym: 'DOJ', name: 'Department of Justice', group: 'Defense & Public Order' },
  { acronym: 'DOLE', name: 'Department of Labor and Employment', group: 'Social Services, Education & Health' },
  { acronym: 'DOST', name: 'Department of Science and Technology', group: 'Key Departments' },
  { acronym: 'DOTr', name: 'Department of Transportation', group: 'Infrastructure, Utilities & Tech' },
  { acronym: 'DPWH', name: 'Department of Public Works and Highways', group: 'Infrastructure, Utilities & Tech' },
  { acronym: 'DSWD', name: 'Department of Social Welfare and Development', group: 'Social Services, Education & Health' },
  { acronym: 'DTI', name: 'Department of Trade and Industry', group: 'Commerce, Industry & Agriculture' },
  { acronym: 'NEDA', name: 'National Economic and Development Authority', group: 'Economic & Financial' },
];

// Philippine Regions in Standard Sequence Starting from Region 1 to the Last
export const PHILIPPINE_REGIONS = [
  'Region 1 - Ilocos Region',
  'Region 2 - Cagayan Valley',
  'Region 3 - Central Luzon',
  'Region 4A - CALABARZON',
  'Region 4B - MIMAROPA',
  'Region 5 - Bicol Region',
  'Region 6 - Western Visayas',
  'Region 7 - Central Visayas (Cebu)',
  'Region 8 - Eastern Visayas',
  'Region 9 - Zamboanga Peninsula',
  'Region 10 - Northern Mindanao',
  'Region 11 - Davao Region',
  'Region 12 - SOCCSKSARGEN',
  'Region 13 - Caraga',
  'NCR - National Capital Region',
  'CAR - Cordillera Administrative Region',
  'BARMM - Bangsamoro Autonomous Region',
];

export const TOP_HIRING_AGENCIES = [
  { name: 'Department of Social Welfare and Development (DSWD)', jobsCount: 48, code: 'DSWD' },
  { name: 'Department of Education (DepEd)', jobsCount: 42, code: 'DepEd' },
  { name: 'Department of Health (DOH)', jobsCount: 35, code: 'DOH' },
  { name: 'Department of Public Works and Highways (DPWH)', jobsCount: 28, code: 'DPWH' },
  { name: 'Bureau of Internal Revenue (BIR)', jobsCount: 24, code: 'BIR' },
  { name: 'Department of Budget and Management (DBM)', jobsCount: 18, code: 'DBM' },
  { name: 'Civil Service Commission (CSC)', jobsCount: 15, code: 'CSC' },
];

// Base Realistic Government Jobs Across All Major Agencies
export const GOVERNMENT_JOBS: GovernmentJob[] = [
  // 1. DSWD (Social Services) - Closing Soon / Today
  {
    id: 'dswd-swo2-cebu',
    title: 'Social Welfare Officer II',
    agency: 'Department of Social Welfare and Development',
    agencyAcronym: 'DSWD',
    region: 'Region 7 - Central Visayas (Cebu)',
    placeOfAssignment: 'DSWD Field Office VII, M.J. Cuenco Ave. cor. Gen. Maxilom Ave., Cebu City',
    salaryGrade: 15,
    monthlySalary: '₱36,619.00',
    itemNumber: 'DSWDB-SOCWO2-54-2020',
    vacancies: 2,
    education: "Bachelor's degree in Social Work (BSW)",
    training: '4 hours of relevant training in case management, social protection, or family welfare',
    experience: '1 year of relevant experience in case work or community organizing',
    eligibility: 'RA 1080 (Registered Social Worker)',
    competency: 'Case management, community mobilization, psychosocial intervention, crisis intervention reporting',
    deadline: 'Sep 20, 2026',
    isClosingSoon: true,
    isDeadlineToday: true,
    isPostedToday: true,
    postedDate: 'Sep 20, 2026',
    documentsNeeded: [
      'Signed application letter stating the Position Title, Item Number, and Office applied for',
      'Fully accomplished and notarized/signed Personal Data Sheet (PDS) and Work Experience Sheet (WES) using CS Form No. 212 Revised 2026 with recent passport-size photo and 3 Character References',
      'Authenticated copy of Transcript of Records (TOR) and Diploma',
      'Authenticated copy of PRC License as Registered Social Worker (RA 1080)',
      'Certificates of relevant training and previous employment (Certificate of Employment or Service Record)',
      'Performance rating in the last rating period (for government employees: at least Very Satisfactory)',
    ],
    howToApply: {
      addresseeName: 'SHALIMAR S. TAMANO',
      addresseeTitle: 'Regional Director',
      addresseeOffice: 'DSWD Field Office VII - Central Visayas',
      addresseeAddress: 'M.J. Cuenco Ave. cor. Gen. Maxilom Ave., Cebu City, 6000',
      contactEmail: 'fo7@dswd.gov.ph',
      contactPhone: '(032) 233-0261',
      portalUrl: 'https://jobs.dswd.gov.ph/',
    },
    applicationNotes: 'APPLICATIONS WITH INCOMPLETE REQUIREMENTS SHALL NOT BE PROCESSED. DSWD FO-VII advocates Equal Employment Opportunity (EEO) regardless of gender, sexual orientation, disability, or ethnicity.',
    skills: [
      'Social casework & counselling',
      'Crisis intervention & intake assessment',
      'Community organizing & 4Ps monitoring',
      'Case study report drafting',
      'Disaster response coordination',
    ],
  },

  // 2. DBM (Economic & Financial) - Closing Soon
  {
    id: 'dbm-bma-cebu',
    title: 'Budget and Management Analyst',
    agency: 'Department of Budget and Management',
    agencyAcronym: 'DBM',
    region: 'Region 7 - Central Visayas (Cebu)',
    placeOfAssignment: 'DBM Regional Office VII, Sudlon, Lahug, Cebu City',
    salaryGrade: 11,
    monthlySalary: '₱27,000.00',
    itemNumber: 'DBMB-BMA-45-2018',
    vacancies: 1,
    education: "Bachelor's degree in Public Administration, Accountancy, Economics, or Business Administration",
    training: 'None required',
    experience: 'None required',
    eligibility: 'Career Service (Professional) / Second Level Eligibility',
    competency: 'National budget monitoring, expenditure analysis, cash allocation scheduling, DBM e-Budget system',
    deadline: 'Sep 21, 2026',
    isClosingSoon: true,
    isPostedToday: true,
    postedDate: 'Sep 20, 2026',
    documentsNeeded: [
      'Signed application letter specifying the Position Title and Item Number',
      'Accomplished CSC Form 212 Revised 2026 Personal Data Sheet with Work Experience Sheet',
      'Certified true copy of Transcript of Records and Diploma',
      'Certificate of CSC Professional Eligibility or RA 1080 (CPA)',
      'Certificate of good moral character',
    ],
    howToApply: {
      addresseeName: 'LENIN S. BERNALES',
      addresseeTitle: 'Regional Director',
      addresseeOffice: 'DBM Regional Office VII',
      addresseeAddress: 'Government Center, Sudlon, Lahug, Cebu City, 6000',
      contactEmail: 'dbmro7@dbm.gov.ph',
      contactPhone: '(032) 254-7544',
      portalUrl: 'https://www.dbm.gov.ph/index.php/careers',
    },
    applicationNotes: 'Applicants must submit their electronic documents via the official DBM Careers Portal or deliver hard copies to the Regional HR Unit.',
    skills: [
      'Budget expenditure review',
      'Financial statement evaluation',
      'Spreadsheet modeling & formulas',
      'Government accounting standards (GAM)',
      'Government procurement law (RA 9184)',
    ],
  },

  // 3. DepEd (Education) - Closing Soon
  {
    id: 'deped-ao2-cebu',
    title: 'Administrative Officer II (HRMO I)',
    agency: 'Department of Education',
    agencyAcronym: 'DepEd',
    region: 'Region 7 - Central Visayas (Cebu)',
    placeOfAssignment: 'Schools Division Office of Cebu City / Cebu Province SDO',
    salaryGrade: 11,
    monthlySalary: '₱27,000.00',
    itemNumber: 'OSEC-DECSB-ADOF2-510022-2020',
    vacancies: 3,
    education: "Bachelor's degree relevant to the job (Public Admin, HR, Management)",
    training: 'None required',
    experience: 'None required',
    eligibility: 'Career Service (Professional) / Second Level Eligibility',
    competency: 'Personnel records management, recruitment processing, DepEd Enterprise HRIS, benefits administration',
    deadline: 'Sep 22, 2026',
    isClosingSoon: true,
    postedDate: 'Sep 19, 2026',
    documentsNeeded: [
      'Letter of intent addressed to the Schools Division Superintendent',
      'Duly accomplished Personal Data Sheet (PDS) CS Form 212 Revised 2026 with recent photo',
      'Work Experience Sheet (WES)',
      'Authenticated copy of CSC Professional Eligibility Certificate',
      'Authenticated copy of Transcript of Records (CHED/School certified)',
    ],
    howToApply: {
      addresseeName: 'DR. SALUSTIANO T. JIMENEZ, CESO V',
      addresseeTitle: 'Regional Director',
      addresseeOffice: 'DepEd Regional Office VII',
      addresseeAddress: 'Doña M. Gothong Memorial National High School Compound, C. Padilla St., Cebu City',
      contactEmail: 'region7@deped.gov.ph',
      contactPhone: '(032) 414-7399',
      portalUrl: 'https://www.deped.gov.ph/about-deped/careers/',
    },
    applicationNotes: 'DepEd promotes gender equality, diversity, and social inclusion. Open to all qualified applicants regardless of religion, ethnicity, or sexual orientation.',
    skills: [
      'Human resource information systems',
      'Leave administration & service records',
      'CSC rules and regulations compliance',
      'Recruitment evaluation & longlisting',
      'Digital archiving',
    ],
  },

  // 4. DOH (Health) - Closing Soon
  {
    id: 'doh-mo3-cebu',
    title: 'Medical Officer III',
    agency: 'Department of Health',
    agencyAcronym: 'DOH',
    region: 'Region 7 - Central Visayas (Cebu)',
    placeOfAssignment: 'Vicente Sotto Memorial Medical Center (VSMMC), B. Rodriguez St., Cebu City',
    salaryGrade: 21,
    monthlySalary: '₱63,997.00',
    itemNumber: 'OSEC-DOHB-MDOF3-82001-2017',
    vacancies: 4,
    education: 'Doctor of Medicine (MD)',
    training: 'None required (post-graduate internship completed)',
    experience: 'None required',
    eligibility: 'RA 1080 (Physician)',
    competency: 'Clinical patient diagnosis, emergency triage, clinical documentation, hospital infection control',
    deadline: 'Sep 23, 2026',
    isClosingSoon: true,
    isPostedToday: true,
    postedDate: 'Sep 20, 2026',
    documentsNeeded: [
      'Application letter specifying the desired department/clinical service',
      'CSC Form 212 Revised 2026 PDS with 2x2 passport-style colored photo with name tag',
      'Valid PRC Physician License (RA 1080 authenticated)',
      'Official Transcript of Records & Doctor of Medicine Diploma',
      'Post Graduate Internship (PGI) Certificate',
    ],
    howToApply: {
      addresseeName: 'DR. GERARDO M. AQUINO JR., MD, MPH, CESE',
      addresseeTitle: 'Medical Center Chief II',
      addresseeOffice: 'Vicente Sotto Memorial Medical Center (VSMMC)',
      addresseeAddress: 'B. Rodriguez St., Cebu City, 6000',
      contactEmail: 'vsmmc_hr@doh.gov.ph',
      contactPhone: '(032) 253-9891',
      portalUrl: 'https://vsmmc.doh.gov.ph/careers',
    },
    applicationNotes: 'Applicants must pass the hospital written exam and oral panel evaluation. Incomplete applications will not be shortlisted.',
    skills: [
      'Inpatient & outpatient clinical management',
      'Emergency resuscitation & ACLS/BLS',
      'Medical ethics and patient safety protocols',
      'Electronic medical records (EMR)',
      'Interdisciplinary team collaboration',
    ],
  },

  // 5. DPWH (Infrastructure) - Closing Soon
  {
    id: 'dpwh-eng2-cebu',
    title: 'Engineer II (Civil)',
    agency: 'Department of Public Works and Highways',
    agencyAcronym: 'DPWH',
    region: 'Region 7 - Central Visayas (Cebu)',
    placeOfAssignment: 'DPWH Cebu 4th District Engineering Office, Poblacion, Dalaguete, Cebu',
    salaryGrade: 16,
    monthlySalary: '₱39,672.00',
    itemNumber: 'DPWHB-ENG2-774-2016',
    vacancies: 2,
    education: "Bachelor's degree in Civil Engineering (BSCE)",
    training: '4 hours of relevant training in structural inspection or highway engineering',
    experience: '1 year of relevant experience in civil engineering design or site supervision',
    eligibility: 'RA 1080 (Registered Civil Engineer)',
    competency: 'Road and bridge project inspection, bill of quantities (BOQ), AutoCAD civil drafting, materials testing',
    deadline: 'Sep 24, 2026',
    isClosingSoon: true,
    postedDate: 'Sep 18, 2026',
    documentsNeeded: [
      'Signed application letter specifying position and item number',
      'Duly accomplished CSC Form 212 Revised 2026 with Work Experience Sheet',
      'Authenticated copy of PRC Civil Engineer license and board rating',
      'Certified copy of College Diploma and Transcript of Records',
      'Certificates of relevant training in project monitoring and safety',
    ],
    howToApply: {
      addresseeName: 'ENGR. ERNESTO S. ESCALANTE',
      addresseeTitle: 'Regional Director',
      addresseeOffice: 'DPWH Regional Office VII',
      addresseeAddress: 'South Road Properties (SRP), Cebu City, 6000',
      contactEmail: 'dpwh_ro7@dpwh.gov.ph',
      contactPhone: '(032) 411-6700',
      portalUrl: 'https://www.dpwh.gov.ph/dpwh/careers',
    },
    applicationNotes: 'Qualified applicants must be ready for site inspections throughout the district. Physical fitness and field readiness required.',
    skills: [
      'Highway and bridge inspection',
      'AutoCAD & Civil 3D design software',
      'Cost estimation and variation order analysis',
      'Quality assurance and concrete strength testing',
      'Contract administration under RA 9184',
    ],
  },

  // 6. BIR (Financial & Tax) - Closing Soon
  {
    id: 'bir-ro1-cebu',
    title: 'Revenue Officer I (Assessment)',
    agency: 'Bureau of Internal Revenue',
    agencyAcronym: 'BIR',
    region: 'Region 7 - Central Visayas (Cebu)',
    placeOfAssignment: 'Revenue Region No. 13 - Cebu City, Archbishop Reyes Ave., Cebu City',
    salaryGrade: 11,
    monthlySalary: '₱27,000.00',
    itemNumber: 'BIRB-RO1-412-2021',
    vacancies: 5,
    education: "Bachelor's degree in Commerce/Business Administration major in Accounting, or Bachelor of Science in Accountancy (BSA)",
    training: 'None required',
    experience: 'None required',
    eligibility: 'RA 1080 (Certified Public Accountant) or CS Professional with 18 units in accounting',
    competency: 'Tax audit and investigation, National Internal Revenue Code (NIRC) compliance, financial ledger analysis',
    deadline: 'Sep 25, 2026',
    isClosingSoon: true,
    postedDate: 'Sep 19, 2026',
    documentsNeeded: [
      'Cover letter expressing interest and specifying the Revenue District Office preference',
      'Accomplished CS Form 212 Revised 2026 PDS with complete character references',
      'Authenticated PRC CPA License or CSC Professional Certificate',
      'Official Transcript of Records with Special Order (SO) if applicable',
      'NBI Clearance issued within the last 6 months',
    ],
    howToApply: {
      addresseeName: 'ATTY. EDUARDO L. PAGUNSAN',
      addresseeTitle: 'Regional Director',
      addresseeOffice: 'BIR Revenue Region No. 13 - Cebu City',
      addresseeAddress: 'BIR Building, Archbishop Reyes Ave., Cebu City, 6000',
      contactEmail: 'rr13_hr@bir.gov.ph',
      contactPhone: '(032) 232-4411',
      portalUrl: 'https://www.bir.gov.ph/index.php/careers.html',
    },
    applicationNotes: 'Candidates will undergo the BIR Pre-Employment Examination (BPEE) and background security investigation.',
    skills: [
      'Tax return verification & audit',
      'Financial statement ratio analysis',
      'Internal revenue laws and tax jurisprudence',
      'Taxpayer assistance & customer service',
      'Automated Internal Revenue Management System',
    ],
  },

  // 7. BOC (Customs & Trade) - Closing Soon
  {
    id: 'boc-coo1-cebu',
    title: 'Customs Operations Officer I',
    agency: 'Bureau of Customs',
    agencyAcronym: 'BOC',
    region: 'Region 7 - Central Visayas (Cebu)',
    placeOfAssignment: 'Port of Cebu - Collection District VII, CIP Complex, Cebu City',
    salaryGrade: 11,
    monthlySalary: '₱27,000.00',
    itemNumber: 'BOCB-COO1-218-2020',
    vacancies: 3,
    education: "Bachelor's degree relevant to the job (Customs Administration, Commerce, Criminology, Law, Public Admin)",
    training: 'None required',
    experience: 'None required',
    eligibility: 'RA 1080 (Customs Broker) or Career Service (Professional) Second Level',
    competency: 'Cargo classification, customs valuation, tariff schedules, import clearance processing, anti-smuggling vigilance',
    deadline: 'Sep 27, 2026',
    isClosingSoon: true,
    postedDate: 'Sep 17, 2026',
    documentsNeeded: [
      'Application letter specifying the position and Collection District VII (Port of Cebu)',
      'Updated Personal Data Sheet (CSC Form 212 Revised 2026) with recent passport photo',
      'Authenticated copy of PRC License or CSC Professional Certificate',
      'Authenticated copy of College Transcript of Records and Diploma',
      'Clearances: NBI, Police, and Barangay Clearance',
    ],
    howToApply: {
      addresseeName: 'BIENVENIDO Y. RUBIO',
      addresseeTitle: 'Commissioner of Customs',
      addresseeOffice: 'Bureau of Customs - Port of Cebu',
      addresseeAddress: 'Customs Building, CIP Complex, Port Area, Cebu City, 6000',
      contactEmail: 'boc_portofcebu@customs.gov.ph',
      contactPhone: '(032) 256-1690',
      portalUrl: 'https://customs.gov.ph/careers/',
    },
    applicationNotes: 'Applicants must pass physical, medical, psychological, and drug testing before final appointment.',
    skills: [
      'ASEAN Harmonized Tariff Nomenclature (AHTN)',
      'Customs Modernization and Tariff Act (CMTA)',
      'Cargo manifest examination',
      'Risk management and port intelligence',
      'Electronic-to-Mobile (e2m) customs system',
    ],
  },

  // 8. DICT (Technology & Telecom)
  {
    id: 'dict-ito1-cebu',
    title: 'Information Technology Officer I',
    agency: 'Department of Information and Communications Technology',
    agencyAcronym: 'DICT',
    region: 'Region 7 - Central Visayas (Cebu)',
    placeOfAssignment: 'DICT Regional Office VII, Gorordo Ave., Cebu City',
    salaryGrade: 19,
    monthlySalary: '₱51,357.00',
    itemNumber: 'DICTB-ITO1-89-2019',
    vacancies: 2,
    education: "Bachelor's degree in Computer Science, Information Technology, Computer Engineering, or related field",
    training: '8 hours of relevant training in network architecture, systems engineering, or cloud infrastructure',
    experience: '2 years of relevant experience in software development, database administration, or network engineering',
    eligibility: 'Career Service (Professional) / Second Level Eligibility / EDP Specialist Eligibility',
    competency: 'Government Network (GovNet) maintenance, cybersecurity protocols, cloud server administration, full-stack API integration',
    deadline: 'Oct 02, 2026',
    isPostedToday: true,
    postedDate: 'Sep 20, 2026',
    documentsNeeded: [
      'Comprehensive cover letter detailing software development and ICT infrastructure experience',
      'CSC Form 212 Revised 2026 Personal Data Sheet with Work Experience Sheet',
      'Authenticated CSC Professional or EDP Specialist Eligibility Certificate',
      'Certified copy of College Transcript of Records and Degree Diploma',
      'Technical certifications (Cisco, CompTIA, AWS/GCP, or Microsoft)',
    ],
    howToApply: {
      addresseeName: 'ENG. FREDERICK D. APARICIO',
      addresseeTitle: 'Regional Director',
      addresseeOffice: 'DICT Region VII (Central Visayas)',
      addresseeAddress: 'DICT Regional Office, Gorordo Ave., Cebu City, 6000',
      contactEmail: 'region7@dict.gov.ph',
      contactPhone: '(032) 412-1400',
      portalUrl: 'https://dict.gov.ph/careers/',
    },
    applicationNotes: 'Shortlisted candidates will be given a hands-on technical programming and network configuration assessment.',
    skills: [
      'Linux/Unix system administration',
      'Government cloud (GovCloud) management',
      'Cybersecurity and vulnerability scanning',
      'PostgreSQL / MySQL / MongoDB administration',
      'REST API design & microservices architecture',
    ],
  },

  // 9. DOLE (Labor & Employment)
  {
    id: 'dole-leo3-cebu',
    title: 'Labor and Employment Officer III',
    agency: 'Department of Labor and Employment',
    agencyAcronym: 'DOLE',
    region: 'Region 7 - Central Visayas (Cebu)',
    placeOfAssignment: 'DOLE Regional Office No. VII, Gorordo Ave. cor. Gen. Maxilom Ave., Cebu City',
    salaryGrade: 16,
    monthlySalary: '₱39,672.00',
    itemNumber: 'DOLEB-LEO3-102-2017',
    vacancies: 1,
    education: "Bachelor's degree relevant to the job (Law, Legal Management, Economics, HR, Industrial Relations)",
    training: '4 hours of relevant training in labor inspection, conciliation, or occupational safety and health',
    experience: '1 year of relevant experience in labor law compliance, dispute resolution, or employee relations',
    eligibility: 'Career Service (Professional) / Second Level Eligibility',
    competency: 'General Labor Standards (GLS) inspection, Occupational Safety and Health (OSH) auditing, Single Entry Approach (SEnA) mediation',
    deadline: 'Oct 05, 2026',
    postedDate: 'Sep 18, 2026',
    documentsNeeded: [
      'Formal application letter stating position title and item number',
      'Updated CSC Form 212 Revised 2026 with recent passport photo',
      'Certified copy of CSC Professional Eligibility certificate',
      'Certified copy of College Transcript of Records and Diploma',
      'Certificates of training in Labor Laws and OSH Standards (BOSH/COSH)',
    ],
    howToApply: {
      addresseeName: 'ATTY. MARION S. SEVILLA',
      addresseeTitle: 'Regional Director',
      addresseeOffice: 'DOLE Regional Office No. VII',
      addresseeAddress: 'DOLE VII Bldg., Gorordo Ave. cor. Gen. Maxilom Ave., Cebu City, 6000',
      contactEmail: 'ro7@dole.gov.ph',
      contactPhone: '(032) 266-0861',
      portalUrl: 'https://ro7.dole.gov.ph/careers',
    },
    applicationNotes: 'Qualified candidates must have strong command of English and Cebuano for dispute mediation and field inquiries.',
    skills: [
      'Labor Code of the Philippines compliance',
      'Dispute conciliation and mediation (SEnA)',
      'Occupational safety inspection',
      'Employment facilitation & TUPAD monitoring',
      'Technical report preparation',
    ],
  },

  // 10. DTI (Commerce & Industry)
  {
    id: 'dti-tids-cebu',
    title: 'Trade-Industry Development Specialist',
    agency: 'Department of Trade and Industry',
    agencyAcronym: 'DTI',
    region: 'Region 7 - Central Visayas (Cebu)',
    placeOfAssignment: 'DTI Region VII - Cebu Provincial Office, Osmeña Blvd., Cebu City',
    salaryGrade: 15,
    monthlySalary: '₱36,619.00',
    itemNumber: 'DTIB-TIDS-64-2018',
    vacancies: 2,
    education: "Bachelor's degree in Business Administration, Marketing, Economics, Entrepreneurship, or related field",
    training: '4 hours of relevant training in MSME development, market research, or export facilitation',
    experience: '1 year of relevant experience in enterprise development, trade promotions, or supply chain assistance',
    eligibility: 'Career Service (Professional) / Second Level Eligibility',
    competency: 'Negosyo Center operation, MSME capacity building, consumer rights enforcement, price monitoring',
    deadline: 'Oct 08, 2026',
    postedDate: 'Sep 19, 2026',
    documentsNeeded: [
      'Letter of application indicating the position and assigned province (Cebu)',
      'Fully accomplished CS Form 212 Revised 2026 with Work Experience Sheet',
      'Authenticated copy of CSC Professional Eligibility',
      'Certified copy of College Transcript of Records and Diploma',
      'Certificates of relevant business coaching or enterprise trainings',
    ],
    howToApply: {
      addresseeName: 'MARIA ELENA C. ARBON',
      addresseeTitle: 'Regional Director',
      addresseeOffice: 'DTI Regional Office VII',
      addresseeAddress: '3rd Floor, WDC Building, Osmeña Blvd. cor. P. Burgos St., Cebu City, 6000',
      contactEmail: 'r07@dti.gov.ph',
      contactPhone: '(032) 255-0036',
      portalUrl: 'https://www.dti.gov.ph/about/careers/',
    },
    applicationNotes: 'DTI welcomes applicants from diverse backgrounds and actively encourages female entrepreneurs and PWDs to apply.',
    skills: [
      'MSME mentorship & business counseling',
      'Product packaging & branding guidance',
      'Consumer protection laws (RA 7394)',
      'Price monitoring & fair trade enforcement',
      'Trade fair and bazaar management',
    ],
  },

  // 11. CSC (Civil Service Commission)
  {
    id: 'csc-srhrs-cebu',
    title: 'Senior Human Resource Specialist',
    agency: 'Civil Service Commission',
    agencyAcronym: 'CSC',
    region: 'Region 7 - Central Visayas (Cebu)',
    placeOfAssignment: 'CSC Regional Office VII, Sudlon, Lahug, Cebu City',
    salaryGrade: 18,
    monthlySalary: '₱46,725.00',
    itemNumber: 'CSCB-SRHRS-33-2017',
    vacancies: 1,
    education: "Bachelor's degree in Psychology, Human Resource Management, Public Administration, or related discipline",
    training: '8 hours of relevant training in civil service law, HR audit, or competency modeling',
    experience: '2 years of relevant experience in HR audit, appointment processing, or civil service examination administration',
    eligibility: 'Career Service (Professional) / Second Level Eligibility',
    competency: 'Omnibus Rules on Appointments and Other Human Resource Actions (ORAOHRA), HR audit, PRIME-HRM accreditation',
    deadline: 'Oct 10, 2026',
    isPostedToday: true,
    postedDate: 'Sep 20, 2026',
    documentsNeeded: [
      'Application letter specifying the position title and item number',
      'Fully accomplished and notarized PDS (CSC Form 212 Revised 2026) with Work Experience Sheet',
      'Authenticated copy of CSC Professional Eligibility Certificate',
      'Certified copy of College Transcript of Records and Diploma',
      'Performance rating for the last two semesters (if already in government service)',
    ],
    howToApply: {
      addresseeName: 'DIR. EDITHA M. DELA PEÑA',
      addresseeTitle: 'Regional Director',
      addresseeOffice: 'CSC Regional Office No. VII',
      addresseeAddress: 'Government Center, Sudlon, Lahug, Cebu City, 6000',
      contactEmail: 'ro07@csc.gov.ph',
      contactPhone: '(032) 253-9640',
      portalUrl: 'https://ro7.csc.gov.ph/careers',
    },
    applicationNotes: 'As the central personnel agency of the Philippine government, CSC enforces strict merit and fitness standards.',
    skills: [
      'Civil Service Law and ORAOHRA interpretation',
      'PRIME-HRM assessment and consulting',
      'Merit Promotion Plan evaluation',
      'Administrative disciplinary procedure',
      'Public sector training facilitation',
    ],
  },

  // 12. NEDA (Economic Development)
  {
    id: 'neda-eds1-cebu',
    title: 'Economic Development Specialist I',
    agency: 'National Economic and Development Authority',
    agencyAcronym: 'NEDA',
    region: 'Region 7 - Central Visayas (Cebu)',
    placeOfAssignment: 'NEDA Regional Office VII, Sudlon, Lahug, Cebu City',
    salaryGrade: 15,
    monthlySalary: '₱36,619.00',
    itemNumber: 'NEDAB-EDS1-27-2019',
    vacancies: 2,
    education: "Bachelor's degree in Economics, Statistics, Development Studies, Applied Mathematics, or Public Policy",
    training: '4 hours of relevant training in economic analysis, regional development planning, or project evaluation',
    experience: '1 year of relevant experience in macroeconomic research, data analysis, or development project monitoring',
    eligibility: 'Career Service (Professional) / Second Level Eligibility',
    competency: 'Regional Development Plan (RDP) formulation, Regional Development Council (RDC) secretariat work, econometric analysis',
    deadline: 'Oct 12, 2026',
    postedDate: 'Sep 16, 2026',
    documentsNeeded: [
      'Cover letter stating the position and bureau of choice',
      'Duly accomplished Personal Data Sheet (CS Form 212 Revised 2026) with WES',
      'Authenticated CSC Professional Certificate',
      'Certified copy of College Transcript of Records and Diploma',
      'Sample research paper, thesis abstract, or policy brief authored by applicant',
    ],
    howToApply: {
      addresseeName: 'JENNIFER C. BRETAÑA, CESO III',
      addresseeTitle: 'Regional Director',
      addresseeOffice: 'NEDA Regional Office VII',
      addresseeAddress: 'Government Center, Sudlon, Lahug, Cebu City, 6000',
      contactEmail: 'neda7@neda.gov.ph',
      contactPhone: '(032) 265-5250',
      portalUrl: 'https://neda.gov.ph/careers/',
    },
    applicationNotes: 'Applicants must possess strong analytical writing capabilities and familiarity with econometric software (Stata, R, Python, or SPSS).',
    skills: [
      'Macroeconomic indicators analysis',
      'Regional Development Council (RDC) support',
      'Cost-benefit and feasibility study review',
      'Policy brief and position paper writing',
      'Statistical data visualization',
    ],
  },

  // 13. DILG (Local Government & Public Order)
  {
    id: 'dilg-lgoo2-cebu',
    title: 'Local Government Operations Officer II',
    agency: 'Department of the Interior and Local Government',
    agencyAcronym: 'DILG',
    region: 'Region 7 - Central Visayas (Cebu)',
    placeOfAssignment: 'DILG Regional Office VII, Sudlon, Lahug, Cebu City',
    salaryGrade: 13,
    monthlySalary: '₱31,320.00',
    itemNumber: 'DILGB-LGOO2-81-2018',
    vacancies: 3,
    education: "Bachelor's degree in Public Administration, Political Science, Sociology, Community Development, or Law",
    training: 'None required',
    experience: 'None required',
    eligibility: 'Career Service (Professional) / Second Level Eligibility',
    competency: 'Seal of Good Local Governance (SGLG) assessment, LGU capacity development, barangay governance audit, disaster preparedness monitoring',
    deadline: 'Oct 15, 2026',
    postedDate: 'Sep 17, 2026',
    documentsNeeded: [
      'Application letter addressed to the Regional Director',
      'Updated Personal Data Sheet (CS Form 212 Revised 2026) with recent photo',
      'Certified copy of CSC Professional Eligibility',
      'Certified copy of Transcript of Records and Diploma',
      'Valid NBI and Police Clearances',
    ],
    howToApply: {
      addresseeName: 'LEOCADIO T. TROVELA, CESO III',
      addresseeTitle: 'Regional Director',
      addresseeOffice: 'DILG Regional Office VII',
      addresseeAddress: 'Sudlon, Lahug, Cebu City, 6000',
      contactEmail: 'dilg_region7@yahoo.com',
      contactPhone: '(032) 253-8320',
      portalUrl: 'https://region7.dilg.gov.ph/careers',
    },
    applicationNotes: 'Must be willing to undergo the intensive DILG LGOO Apprenticeship / Pre-Service Training Program and accept field assignments across Region 7.',
    skills: [
      'Local Government Code (RA 7160) application',
      'Seal of Good Local Governance assessment',
      'Barangay development planning facilitation',
      'Conflict resolution & community consensus',
      'Administrative investigation reporting',
    ],
  },

  // 14. DA (Agriculture & Food Security)
  {
    id: 'da-ag2-cebu',
    title: 'Agriculturist II',
    agency: 'Department of Agriculture',
    agencyAcronym: 'DA',
    region: 'Region 7 - Central Visayas (Cebu)',
    placeOfAssignment: 'DA Regional Field Office 7, Highway Maguikay, Mandaue City, Cebu',
    salaryGrade: 15,
    monthlySalary: '₱36,619.00',
    itemNumber: 'OSEC-DAB-AG2-140-2016',
    vacancies: 2,
    education: "Bachelor's degree in Agriculture, Agricultural Engineering, Crop Science, or Agronomy",
    training: '4 hours of relevant training in crop production, pest management, or agricultural extension',
    experience: '1 year of relevant experience in agricultural research, seed certification, or field extension services',
    eligibility: 'RA 1080 (Registered Agriculturist / Agricultural Engineer)',
    competency: 'High-value crop production, agricultural machinery deployment, farmer registry (RSBSA), soil nutrient assessment',
    deadline: 'Oct 18, 2026',
    postedDate: 'Sep 18, 2026',
    documentsNeeded: [
      'Application letter specifying the position applied for',
      'CS Form 212 Revised 2026 PDS with Work Experience Sheet',
      'Authenticated PRC License as Licensed Agriculturist (RA 1080)',
      'Certified copy of College Transcript of Records and Diploma',
      'Certificates of relevant agricultural technology trainings',
    ],
    howToApply: {
      addresseeName: 'ANGEL C. ENRIQUEZ, CESO III',
      addresseeTitle: 'Regional Executive Director',
      addresseeOffice: 'DA Regional Field Office VII',
      addresseeAddress: 'Highway Maguikay, Mandaue City, Cebu, 6014',
      contactEmail: 'da_rfo7@yahoo.com',
      contactPhone: '(032) 268-2698',
      portalUrl: 'https://rfu07.da.gov.ph/careers',
    },
    applicationNotes: 'Position involves active field visitations across farmers cooperatives in Cebu, Bohol, Negros Oriental, and Siquijor.',
    skills: [
      'Crop pest & disease diagnostic',
      'Registry System for Basic Sectors in Agriculture (RSBSA)',
      'Seed certification and soil sampling',
      'Farmer field school (FFS) facilitation',
      'Post-harvest loss mitigation',
    ],
  },

  // 15. DENR (Environment & Forestry)
  {
    id: 'denr-for3-cebu',
    title: 'Forester III',
    agency: 'Department of Environment and Natural Resources',
    agencyAcronym: 'DENR',
    region: 'Region 7 - Central Visayas (Cebu)',
    placeOfAssignment: 'PENRO Cebu / CENRO Argao, San Fernando, Cebu',
    salaryGrade: 18,
    monthlySalary: '₱46,725.00',
    itemNumber: 'OSEC-DENRB-FOR3-201-2015',
    vacancies: 1,
    education: "Bachelor's degree in Forestry",
    training: '8 hours of relevant training in forest protection, watershed management, or GIS',
    experience: '2 years of relevant experience in forestry administration or forest law enforcement',
    eligibility: 'RA 1080 (Registered Professional Forester)',
    competency: 'Forest land use planning (FLUP), National Greening Program (NGP) validation, protected area biodiversity monitoring',
    deadline: 'Oct 20, 2026',
    postedDate: 'Sep 15, 2026',
    documentsNeeded: [
      'Signed application letter specifying the Position Title and Item Number',
      'CSC Form 212 Revised 2026 PDS with recent passport-size photo and 3 Character References',
      'Work Experience Sheet (WES)',
      'Authenticated copy of PRC License (RA 1080 Forester)',
      'Certified true copy of Transcript of Records and Diploma',
    ],
    howToApply: {
      addresseeName: 'PAQUITO D. MELICOR JR., CESO IV',
      addresseeTitle: 'Regional Executive Director',
      addresseeOffice: 'DENR Regional Office VII',
      addresseeAddress: 'Greenhills, Banilad, Mandaue City, Cebu, 6014',
      contactEmail: 'r7@denr.gov.ph',
      contactPhone: '(032) 346-9612',
      portalUrl: 'https://r7.denr.gov.ph/careers',
    },
    applicationNotes: 'Incomplete applications will not be shortlisted. DENR provides equal employment opportunity to all applicants.',
    skills: [
      'Forest inventory & biomass sampling',
      'GIS drone mapping and satellite analysis',
      'Watershed conservation management',
      'Forest law enforcement (PD 705 / RA 9175)',
      'Community consultations & IEC campaigns',
    ],
  },

  // 16. DOJ (Justice & Legal)
  {
    id: 'doj-sc1-cebu',
    title: 'State Counsel I',
    agency: 'Department of Justice',
    agencyAcronym: 'DOJ',
    region: 'Region 7 - Central Visayas (Cebu)',
    placeOfAssignment: 'Department of Justice - Regional Prosecution Office VII, Cebu City',
    salaryGrade: 22,
    monthlySalary: '₱71,511.00',
    itemNumber: 'DOJB-SC1-19-2020',
    vacancies: 1,
    education: 'Bachelor of Laws (LL.B.) or Juris Doctor (J.D.)',
    training: '16 hours of relevant training in legal drafting, international arbitration, or administrative litigation',
    experience: '3 years of relevant experience in litigation, contract review, or government legal practice',
    eligibility: 'RA 1080 (Bar Member / Philippine Bar Passer)',
    competency: 'Legal opinion formulation, treaty review, government contract review, representation in appellate proceedings',
    deadline: 'Oct 22, 2026',
    postedDate: 'Sep 16, 2026',
    documentsNeeded: [
      'Formal cover letter addressed to the Secretary of Justice',
      'Accomplished PDS (CSC Form 212 Revised 2026) with WES',
      'Roll of Attorneys Certification from the Supreme Court of the Philippines',
      'Integrated Bar of the Philippines (IBP) Good Standing Certificate and MCLE compliance',
      'Certified true copy of Law School Transcript of Records and Diploma',
    ],
    howToApply: {
      addresseeName: 'ATTY. JESUS CRISPIN C. REMULLA',
      addresseeTitle: 'Secretary of Justice',
      addresseeOffice: 'Department of Justice - Regional State Prosecution Office VII',
      addresseeAddress: 'Palace of Justice, Capitol Compound, Cebu City, 6000',
      contactEmail: 'doj7@doj.gov.ph',
      contactPhone: '(032) 253-1290',
      portalUrl: 'https://doj.gov.ph/careers.html',
    },
    applicationNotes: 'Candidates will be subjected to comprehensive character and integrity checks by the National Bureau of Investigation.',
    skills: [
      'Statutory construction & legal research',
      'Government commercial contract vetting',
      'Administrative due process adjudication',
      'Legal memorandum & brief drafting',
      'Appellate court representation',
    ],
  },

  // 17. DFA (Foreign Affairs)
  {
    id: 'dfa-fso4-cebu',
    title: 'Foreign Service Officer Class IV',
    agency: 'Department of Foreign Affairs',
    agencyAcronym: 'DFA',
    region: 'Region 7 - Central Visayas (Cebu)',
    placeOfAssignment: 'DFA Consular Office Cebu, SM Seaside City, South Road Properties, Cebu City',
    salaryGrade: 24,
    monthlySalary: '₱90,078.00',
    itemNumber: 'DFAB-FSO4-08-2021',
    vacancies: 1,
    education: "Bachelor's degree from a recognized institution",
    training: 'None required (Intensive Foreign Service Institute training upon appointment)',
    experience: 'None required',
    eligibility: 'Foreign Service Officer (FSO) Examination Eligibility',
    competency: 'Diplomatic protocol, consular passport/visa administration, international bilateral negotiation, assistance-to-nationals (ATN)',
    deadline: 'Oct 25, 2026',
    postedDate: 'Sep 17, 2026',
    documentsNeeded: [
      'Letter of application addressed to the Secretary for Foreign Affairs',
      'CS Form 212 Revised 2026 PDS with passport-size photo with white background',
      'Official Certificate of Passing the FSO Examination issued by the Board of Foreign Service Examinations (BFSE)',
      'College Transcript of Records and Diploma with apostille/authentication',
      'Valid Philippine Passport copy',
    ],
    howToApply: {
      addresseeName: 'ENRIQUE A. MANALO',
      addresseeTitle: 'Secretary for Foreign Affairs',
      addresseeOffice: 'DFA Consular Office Cebu',
      addresseeAddress: 'Level 3, Seaview Wing, SM Seaside City, South Road Properties, Cebu City, 6000',
      contactEmail: 'cebu.rco@dfa.gov.ph',
      contactPhone: '(032) 520-5898',
      portalUrl: 'https://dfa.gov.ph/careers',
    },
    applicationNotes: 'Must be a natural-born Filipino citizen, willing to be assigned to any Philippine Foreign Service Post (Embassy/Consulate General) abroad.',
    skills: [
      'Bilateral and multilateral diplomacy',
      'Consular services (Passport, Apostille, Visa)',
      'Assistance to Nationals (ATN) crisis response',
      'Proficiency in international languages',
      'Economic and cultural diplomacy',
    ],
  },

  // 18. DMW (Migrant Workers)
  {
    id: 'dmw-mwpo2-cebu',
    title: 'Migrant Workers Protection Officer II',
    agency: 'Department of Migrant Workers',
    agencyAcronym: 'DMW',
    region: 'Region 7 - Central Visayas (Cebu)',
    placeOfAssignment: 'DMW Regional Center VII, Robinsons Galleria Cebu, Gen. Maxilom Ave. Ext., Cebu City',
    salaryGrade: 15,
    monthlySalary: '₱36,619.00',
    itemNumber: 'DMWB-MWPO2-42-2023',
    vacancies: 2,
    education: "Bachelor's degree in Psychology, Social Work, Law, Political Science, or Foreign Service",
    training: '4 hours of relevant training in migration affairs, anti-illegal recruitment, or labor welfare',
    experience: '1 year of relevant experience in overseas worker welfare assistance or case documentation',
    eligibility: 'Career Service (Professional) / Second Level Eligibility',
    competency: 'Anti-Illegal Recruitment (AIR) investigation, OFW welfare assistance, Overseas Employment Certificate (OEC) verification, reintegration counseling',
    deadline: 'Oct 28, 2026',
    postedDate: 'Sep 18, 2026',
    documentsNeeded: [
      'Application letter specifying the position title',
      'Completed CS Form 212 Revised 2026 PDS with Work Experience Sheet',
      'CSC Professional Certificate of Eligibility',
      'Certified College Transcript of Records and Diploma',
      'Certificate of relevant employment or volunteer work in OFW welfare',
    ],
    howToApply: {
      addresseeName: 'HANS LEO J. CACDAC',
      addresseeTitle: 'Secretary of Migrant Workers',
      addresseeOffice: 'DMW Regional Center VII',
      addresseeAddress: 'Level 2, Robinsons Galleria Cebu, General Maxilom Ave. Ext., Cebu City, 6000',
      contactEmail: 'region7@dmw.gov.ph',
      contactPhone: '(032) 254-4198',
      portalUrl: 'https://dmw.gov.ph/careers',
    },
    applicationNotes: 'DMW advocates for the highest level of care, dignity, and rights protection for modern-day Filipino heroes and their families.',
    skills: [
      'OFW case management & intake handling',
      'Anti-illegal recruitment and trafficking monitoring',
      'Employment contract review and compliance',
      'Repatriation coordination protocols',
      'Reintegration program facilitation',
    ],
  },

  // 19. DOST (Science & Technology)
  {
    id: 'dost-ssrs-cebu',
    title: 'Senior Science Research Specialist',
    agency: 'Department of Science and Technology',
    agencyAcronym: 'DOST',
    region: 'Region 7 - Central Visayas (Cebu)',
    placeOfAssignment: 'DOST Regional Office VII, Gov. M. Cuenco Ave., Banilad, Cebu City',
    salaryGrade: 19,
    monthlySalary: '₱51,357.00',
    itemNumber: 'DOSTB-SSRS-72-2018',
    vacancies: 1,
    education: "Bachelor's degree in Chemistry, Chemical Engineering, Food Technology, Physics, or Materials Science",
    training: '8 hours of relevant training in laboratory instrumentation, R&D management, or technology transfer',
    experience: '2 years of relevant experience in scientific research, ISO 17025 laboratory testing, or tech innovation incubation',
    eligibility: 'RA 1080 (Chemist / Chemical Engineer) or Career Service (Professional)',
    competency: 'Regional Standards and Testing Laboratory (RSTL) operations, Small Enterprise Technology Upgrading Program (SETUP), scientific grant evaluation',
    deadline: 'Oct 30, 2026',
    postedDate: 'Sep 19, 2026',
    documentsNeeded: [
      'Cover letter highlighting research and laboratory experience',
      'CS Form 212 Revised 2026 Personal Data Sheet with Work Experience Sheet',
      'Authenticated PRC License / CSC Professional Certificate',
      'Certified College Transcript of Records and Diploma',
      'List of published research articles, patents, or technical manuals',
    ],
    howToApply: {
      addresseeName: 'ENGR. JESUS F. ZAMORA JR.',
      addresseeTitle: 'Regional Director',
      addresseeOffice: 'DOST Regional Office No. VII',
      addresseeAddress: 'DOST Complex, Gov. M. Cuenco Ave., Banilad, Cebu City, 6000',
      contactEmail: 'dost7@region7.dost.gov.ph',
      contactPhone: '(032) 418-9011',
      portalUrl: 'https://region7.dost.gov.ph/careers',
    },
    applicationNotes: 'Applicants with experience in advanced chromatography (HPLC, GC-MS) and ISO 17025 laboratory audits are prioritized.',
    skills: [
      'Chemical & microbiological laboratory analysis',
      'ISO/IEC 17025 quality management systems',
      'SETUP technology appraisal for MSMEs',
      'Intellectual property (IP) and patent drafting',
      'Scientific data modeling and instrumentation',
    ],
  },

  // 20. DOTr (Transportation)
  {
    id: 'dotr-tdo2-cebu',
    title: 'Transportation Development Officer II',
    agency: 'Department of Transportation',
    agencyAcronym: 'DOTr',
    region: 'Region 7 - Central Visayas (Cebu)',
    placeOfAssignment: 'DOTr - Land Transportation Office (LTO Region VII), N. Bacalso Ave., Cebu City',
    salaryGrade: 15,
    monthlySalary: '₱36,619.00',
    itemNumber: 'DOTRB-TDO2-93-2020',
    vacancies: 2,
    education: "Bachelor's degree in Urban Planning, Transportation Management, Civil Engineering, or Public Administration",
    training: '4 hours of relevant training in route planning, traffic engineering, or public transit modernizations',
    experience: '1 year of relevant experience in transport operations, traffic data gathering, or public utility vehicle (PUV) regulation',
    eligibility: 'Career Service (Professional) / Second Level Eligibility',
    competency: 'Public Utility Vehicle Modernization Program (PUVMP), route rationalization, Cebu Bus Rapid Transit (BRT) integration, automated fare collection systems',
    deadline: 'Nov 02, 2026',
    postedDate: 'Sep 18, 2026',
    documentsNeeded: [
      'Application letter specifying the position and regional office',
      'CSC Form 212 Revised 2026 Personal Data Sheet with Work Experience Sheet',
      'Certified copy of CSC Professional Eligibility',
      'Certified College Transcript of Records and Diploma',
      'Certificates of relevant training in transportation and GIS analysis',
    ],
    howToApply: {
      addresseeName: 'GLEN G. GALARIO',
      addresseeTitle: 'Regional Director',
      addresseeOffice: 'DOTr - Land Transportation Office Region VII',
      addresseeAddress: 'LTO Compound, N. Bacalso Ave., Cebu City, 6000',
      contactEmail: 'lto_ro7@lto.gov.ph',
      contactPhone: '(032) 256-0275',
      portalUrl: 'https://dotr.gov.ph/careers',
    },
    applicationNotes: 'Supports the ongoing implementation of the Cebu Bus Rapid Transit (BRT) system and intelligent transportation networks in Metro Cebu.',
    skills: [
      'Transit route planning and GIS mapping',
      'PUV fleet modernization oversight',
      'Traffic volume data collection & modeling',
      'Transport franchise compliance review',
      'Stakeholder consultation with transport operators',
    ],
  },

  // 21. DOE (Energy)
  {
    id: 'doe-srsp2-cebu',
    title: 'Science Research Specialist II (Energy)',
    agency: 'Department of Energy',
    agencyAcronym: 'DOE',
    region: 'Region 7 - Central Visayas (Cebu)',
    placeOfAssignment: 'DOE Visayas Field Office, Gorordo Ave., Cebu City',
    salaryGrade: 16,
    monthlySalary: '₱39,672.00',
    itemNumber: 'DOEB-SRSP2-55-2017',
    vacancies: 1,
    education: "Bachelor's degree in Electrical Engineering, Mechanical Engineering, Renewable Energy, or Energy Technology",
    training: '4 hours of relevant training in renewable energy systems, grid codes, or energy efficiency and conservation',
    experience: '1 year of relevant experience in power plant inspection, renewable energy project development, or energy auditing',
    eligibility: 'RA 1080 (Registered Electrical/Mechanical Engineer)',
    competency: 'Renewable Energy Law (RA 9513) compliance, solar/wind resource assessment, Wholesale Electricity Spot Market (WESM) monitoring',
    deadline: 'Nov 05, 2026',
    postedDate: 'Sep 17, 2026',
    documentsNeeded: [
      'Application letter addressed to the Visayas Field Office Director',
      'Updated CS Form 212 Revised 2026 with recent photo and signature',
      'Authenticated PRC License as Registered Professional Engineer',
      'Certified College Transcript of Records and Diploma',
      'Certificates of training in Energy Efficiency and Renewable Technologies',
    ],
    howToApply: {
      addresseeName: 'ENGR. ANTONIO M. LABIOS',
      addresseeTitle: 'Director, Visayas Field Office',
      addresseeOffice: 'Department of Energy - Visayas Field Office',
      addresseeAddress: 'DOE Building, Gorordo Ave., Cebu City, 6000',
      contactEmail: 'vfo@doe.gov.ph',
      contactPhone: '(032) 253-7222',
      portalUrl: 'https://www.doe.gov.ph/careers',
    },
    applicationNotes: 'Must be willing to perform energy resource field audits across power generation facilities throughout the Visayas power grid.',
    skills: [
      'Renewable energy capacity verification',
      'Energy efficiency audit (RA 11285)',
      'Electric power distribution & transmission standards',
      'Petroleum and fuel quality sampling',
      'Energy data analytics & forecasting',
    ],
  },

  // 22. DOF (Finance & Fiscal Policy)
  {
    id: 'dof-fex2-manila',
    title: 'Fiscal Examiner II',
    agency: 'Department of Finance',
    agencyAcronym: 'DOF',
    region: 'NCR - National Capital Region',
    placeOfAssignment: 'DOF Central Office, BSP Complex, Roxas Blvd., Manila',
    salaryGrade: 15,
    monthlySalary: '₱36,619.00',
    itemNumber: 'DOFB-FEX2-16-2020',
    vacancies: 2,
    education: "Bachelor's degree in Economics, Accountancy, Public Finance, or Applied Mathematics",
    training: '4 hours of relevant training in fiscal policy analysis, debt management, or government financial modeling',
    experience: '1 year of relevant experience in fiscal analysis, sovereign debt monitoring, or tax policy evaluation',
    eligibility: 'Career Service (Professional) / Second Level Eligibility',
    competency: 'Revenue mobilization projection, sovereign credit rating tracking, Government Owned and Controlled Corporations (GOCC) dividend evaluation',
    deadline: 'Nov 08, 2026',
    postedDate: 'Sep 18, 2026',
    documentsNeeded: [
      'Application letter addressed to the Secretary of Finance',
      'Completed CS Form 212 Revised 2026 PDS with WES',
      'Authenticated CSC Professional Certificate',
      'Official Transcript of Records and Diploma',
      'Certificates of relevant trainings in financial programming or macroeconomics',
    ],
    howToApply: {
      addresseeName: 'RALPH G. RECTO',
      addresseeTitle: 'Secretary of Finance',
      addresseeOffice: 'Department of Finance Central Office',
      addresseeAddress: 'DOF Building, BSP Complex, Roxas Blvd., Manila, 1004',
      contactEmail: 'careers@dof.gov.ph',
      contactPhone: '(02) 8523-9216',
      portalUrl: 'https://www.dof.gov.ph/careers/',
    },
    applicationNotes: 'The Department of Finance maintains high standards of fiscal integrity. Applicants undergo rigorous background security verification.',
    skills: [
      'Macroeconomic fiscal forecasting',
      'GOCC financial viability analysis',
      'Public debt sustainability modeling',
      'Official Development Assistance (ODA) tracking',
      'Quantitative econometrics in R or Python',
    ],
  },

  // 23. DND (National Defense)
  {
    id: 'dnd-cdo2-cebu',
    title: 'Civil Defense Officer II',
    agency: 'Department of National Defense',
    agencyAcronym: 'DND',
    region: 'Region 7 - Central Visayas (Cebu)',
    placeOfAssignment: 'Office of Civil Defense (OCD-DND Region VII), Camp Lapu-Lapu, Apas, Cebu City',
    salaryGrade: 15,
    monthlySalary: '₱36,619.00',
    itemNumber: 'OCDB-CDO2-31-2019',
    vacancies: 2,
    education: "Bachelor's degree in Disaster Risk Management, Criminology, Public Administration, Civil Engineering, or Health Sciences",
    training: '4 hours of relevant training in Incident Command System (ICS), disaster risk reduction (DRRM), or emergency operations',
    experience: '1 year of relevant experience in disaster response coordination, contingency planning, or civil defense operations',
    eligibility: 'Career Service (Professional) / Second Level Eligibility',
    competency: 'Emergency Operations Center (EOC) protocols, Post-Disaster Needs Assessment (PDNA), Rapid Damage Assessment (RDANA)',
    deadline: 'Nov 10, 2026',
    postedDate: 'Sep 19, 2026',
    documentsNeeded: [
      'Application letter specifying the position title and item number',
      'Duly accomplished CSC Form 212 Revised 2026 PDS with Work Experience Sheet',
      'Authenticated CSC Professional Certificate',
      'Certified College Transcript of Records and Diploma',
      'Incident Command System (ICS) or DRRM Training Certificates',
    ],
    howToApply: {
      addresseeName: 'JOEL ELICIO P. JOSUE',
      addresseeTitle: 'Regional Director',
      addresseeOffice: 'Office of Civil Defense - Region VII',
      addresseeAddress: 'Camp Lapu-Lapu, Apas, Cebu City, 6000',
      contactEmail: 'ocd7cebu@yahoo.com',
      contactPhone: '(032) 410-7405',
      portalUrl: 'https://ocd.gov.ph/careers',
    },
    applicationNotes: 'Must be physically fit and willing to deploy on 24/7 rotational standby during typhoons and national calamity alerts.',
    skills: [
      'Incident Command System (ICS) execution',
      'Disaster Operations Center management',
      'Contingency plan formulation & simulation',
      'Relief logistics and warehouse management',
      'Inter-agency crisis communication',
    ],
  },
];

export const GUIDES_AND_RESOURCES = [
  {
    id: 'how-to-fill-out-pds',
    tag: 'GUIDES',
    title: 'How to Fill Out Your PDS',
    excerpt: 'Step-by-step guide to completing your Personal Data Sheet (CS Form 212) correctly.',
    readTime: '6 min read',
    url: '/builder',
  },
  {
    id: 'how-to-write-application-letter',
    tag: 'GUIDES',
    title: 'How to Write an Application Letter',
    excerpt: 'Learn how to create a strong government application letter that stands out to hiring committees.',
    readTime: '5 min read',
    url: '/jobs',
  },
  {
    id: 'salary-grade-2026',
    tag: 'GUIDES',
    title: 'Salary Grade 2026 Philippines: Complete Salary Grade Table (Third Tranche)',
    excerpt: 'The Department of Budget and Management (DBM) has released the official Salary Grade 2026 table under the Third Tranche salary standardization law.',
    readTime: '8 min read',
    url: '/jobs',
  },
  {
    id: 'csc-form-212-revised-2026-guide',
    tag: 'GUIDES',
    title: 'CSC Form 212 Revised 2026: Complete Guide to the Personal Data Sheet (PDS)',
    excerpt: 'Learn everything about CSC Form 212 Revised 2026, including how to properly fill out the Personal Data Sheet, required attachments, and common mistakes.',
    readTime: '10 min read',
    url: '/builder',
  },
  {
    id: 'best-websites-portals-gov-jobs',
    tag: 'RESOURCES',
    title: 'Best Websites and Portals for Finding Government Jobs in the Philippines (2026 Guide)',
    excerpt: 'Looking for legitimate government job openings in the Philippines? Discover the best websites, portals, and official agency career portals.',
    readTime: '7 min read',
    url: '/jobs',
  },
  {
    id: 'csc-requirements-gov-job-applications',
    tag: 'GUIDES',
    title: 'CSC Requirements for Government Job Applications (Complete 2026 Guide)',
    excerpt: 'Learn the complete list of CSC requirements for applying to government jobs in the Philippines, including PDS, eligibility, WES, and certifications.',
    readTime: '6 min read',
    url: '/builder',
  },
];

// Dynamically compute active jobs synchronized to the real current calendar date
export function getDynamicGovernmentJobs(refDate: Date = new Date()): GovernmentJob[] {
  // Pre-configured realistic offsets for government vacancy cycle
  // Ensures diverse agencies in Jobs Closing Soon (0-7 days) and Latest Openings
  const scheduleOffsets = [
    { deadlineDays: 0, postedDays: 0 },   // Job 0 (DSWD): Deadline TODAY, posted today
    { deadlineDays: 1, postedDays: 0 },   // Job 1 (DBM): Closing in 1 day, posted today
    { deadlineDays: 2, postedDays: 1 },   // Job 2 (DepEd): Closing in 2 days, posted yesterday
    { deadlineDays: 3, postedDays: 0 },   // Job 3 (DOH): Closing in 3 days, posted today
    { deadlineDays: 4, postedDays: 2 },   // Job 4 (DPWH): Closing in 4 days, posted 2 days ago
    { deadlineDays: 5, postedDays: 1 },   // Job 5 (BIR): Closing in 5 days, posted yesterday
    { deadlineDays: 7, postedDays: 3 },   // Job 6 (BOC): Closing in 7 days, posted 3 days ago
    { deadlineDays: 12, postedDays: 0 },  // Job 7 (DICT): Open 12 days, posted today
    { deadlineDays: 15, postedDays: 2 },  // Job 8 (DOLE): Open 15 days, posted 2 days ago
    { deadlineDays: 18, postedDays: 1 },  // Job 9 (DTI): Open 18 days, posted yesterday
    { deadlineDays: 20, postedDays: 0 },  // Job 10 (CSC): Open 20 days, posted today
    { deadlineDays: 22, postedDays: 4 },  // Job 11 (NEDA): Open 22 days, posted 4 days ago
    { deadlineDays: 25, postedDays: 3 },  // Job 12 (DILG): Open 25 days, posted 3 days ago
    { deadlineDays: 28, postedDays: 2 },  // Job 13 (DA): Open 28 days, posted 2 days ago
    { deadlineDays: 30, postedDays: 5 },  // Job 14 (DENR): Open 30 days, posted 5 days ago
    { deadlineDays: 32, postedDays: 4 },  // Job 15 (DOJ): Open 32 days, posted 4 days ago
    { deadlineDays: 35, postedDays: 3 },  // Job 16 (DFA): Open 35 days, posted 3 days ago
    { deadlineDays: 38, postedDays: 2 },  // Job 17 (DMW): Open 38 days, posted 2 days ago
    { deadlineDays: 40, postedDays: 1 },  // Job 18 (DOST): Open 40 days, posted yesterday
    { deadlineDays: 42, postedDays: 2 },  // Job 19 (DOTr): Open 42 days, posted 2 days ago
    { deadlineDays: 45, postedDays: 3 },  // Job 20 (DOE): Open 45 days, posted 3 days ago
    { deadlineDays: 48, postedDays: 2 },  // Job 21 (DOF): Open 48 days, posted 2 days ago
    { deadlineDays: 50, postedDays: 1 },  // Job 22 (DND): Open 50 days, posted yesterday
  ];

  return GOVERNMENT_JOBS.map((job, index) => {
    const offset = scheduleOffsets[index % scheduleOffsets.length];
    
    const deadlineDate = new Date(refDate);
    deadlineDate.setDate(refDate.getDate() + offset.deadlineDays);

    const postedDate = new Date(refDate);
    postedDate.setDate(refDate.getDate() - offset.postedDays);

    const daysLeft = offset.deadlineDays;
    const isDeadlineToday = daysLeft === 0;
    const isClosingSoon = daysLeft >= 0 && daysLeft <= 7;
    const isPostedToday = offset.postedDays === 0;

    return {
      ...job,
      deadline: formatPrettyDate(deadlineDate),
      postedDate: formatPrettyDate(postedDate),
      daysLeft,
      isDeadlineToday,
      isClosingSoon,
      isPostedToday,
      isNewToday: isPostedToday,
      isToday: isDeadlineToday,
    };
  });
}
