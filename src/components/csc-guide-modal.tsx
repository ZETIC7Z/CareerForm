'use client';

import {useState} from 'react';
import {X, BookOpen, Search, CheckCircle2, AlertTriangle, FileText, ChevronRight} from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
};

const SECTIONS = [
  {
    id: 'general',
    title: 'General Rules & Instructions',
    page: '1',
    content: (
      <div className="guide-body-text">
        <div className="guide-callout info">
          <strong>Official CSC CS Form No. 212 (Revised 2026) Standards</strong>
          <p>Please fill out each of the fields in the PDS when applicable. Review these official Civil Service Commission mandates carefully:</p>
        </div>
        <ul className="guide-list">
          <li><strong>Official Format:</strong> Accomplish using the official format provided on the CSC official website.</li>
          <li><strong>Tick boxes:</strong> All tick boxes are marked accurately once selected.</li>
          <li><strong>E-Signature / Digital Certificate:</strong> The PDS must bear the e-signature or digital certificate of the employee and date of accomplishment at the bottom of every page.</li>
          <li><strong>Digital accomplishment:</strong> Entries in the PDS must be filled out via computer.</li>
          <li><strong>Accurate Information:</strong> All information should be provided accurately without misrepresentation.</li>
          <li><strong>No blank entries:</strong> Do not leave blank entries. Put <code>N/A</code> if not applicable.</li>
          <li><strong>Separate Sheets C5 to C11:</strong> Sheets C5 to C11 are for entering additional information on separate sheets as necessary (Family, Education, Eligibility, Work, Voluntary, L&amp;D, Other Information).</li>
          <li><strong>Work Experience Sheet (WES):</strong> The additional sheet for work experience (WES) should be accomplished as a required attachment to the PDS for applications to vacant positions.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'sec1',
    title: 'I. Personal Information',
    page: '1',
    content: (
      <div className="guide-body-text">
        <ul className="guide-list">
          <li><strong>Employee’s name:</strong> Must be filled out in the following order: <code>SURNAME</code>, <code>FIRST NAME</code>, <code>NAME EXTENSION</code> (if any, e.g. Jr., III), <code>MIDDLE NAME</code>.</li>
          <li><strong>Dates:</strong> Enter numeric format: <code>DD/MM/YYYY</code>.</li>
          <li><strong>Civil Status:</strong> If choosing &ldquo;Others&rdquo;, give specific details in the space provided.</li>
          <li><strong>Agency Employee Number:</strong> Refers to your employee ID number in your current government agency.</li>
          <li><strong>Foreign / Dual Citizenship:</strong> For holders of foreign or dual citizenship, select from the dropdown or indicate the foreign country where you were born or naturalized.</li>
        </ul>
        <div className="guide-callout warning">
          <AlertTriangle size={16} />
          <span><strong>Warning:</strong> Any misrepresentation made in the Personal Data Sheet and the Work Experience Sheet shall cause the filing of administrative or criminal case/s against the person concerned.</span>
        </div>
      </div>
    ),
  },
  {
    id: 'sec2',
    title: 'II. Family Background',
    page: '1-2',
    content: (
      <div className="guide-body-text">
        <ul className="guide-list">
          <li><strong>Spouse &amp; Parents:</strong> Enter in the order: <code>Surname, First Name, Name Extension, Middle Name</code>.</li>
          <li><strong>Mother&rsquo;s Name:</strong> Her maiden name (her name when she was single or before marriage).</li>
          <li><strong>Children:</strong> List full names (first name and surname) of <em>ALL</em> your children.</li>
          <li><strong>Date of Birth:</strong> Numeric format: <code>DD/MM/YYYY</code>.</li>
          <li>Use sheet C5 if the provided rows on sheet C1 are not enough.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'sec3',
    title: 'III. Educational Background',
    page: '2',
    content: (
      <div className="guide-body-text">
        <ul className="guide-list">
          <li><strong>School Names:</strong> Indicate <strong>FULL</strong> name of schools. <strong>DO NOT ABBREVIATE</strong>.</li>
          <li><strong>Elementary Level:</strong> Indicate <code>PRIMARY EDUCATION</code> if graduated.</li>
          <li><strong>Secondary Level:</strong> Indicate <code>HIGH SCHOOL</code> if graduated under the old curriculum; or <code>JUNIOR HIGH SCHOOL</code> / <code>SENIOR HIGH SCHOOL</code> under the K-12 curriculum.</li>
          <li><strong>College &amp; Graduate Courses:</strong> Indicate in FULL all courses taken (e.g. <code>ASSOCIATE IN ARTS</code>, <code>AB ECONOMICS</code>, <code>BS PSYCHOLOGY</code>, <code>MA IN HISTORY</code>, <code>PHD IN EDUCATION</code>).</li>
          <li><strong>Graduation:</strong> If graduated for every level, indicate the year of graduation. If not graduated, indicate the highest grade, level, or units earned.</li>
          <li><strong>Period of Attendance:</strong> School years (e.g., <code>1992–1996</code>).</li>
          <li>Use sheet C6 if the provided rows on sheet C1 are not enough.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'sec4',
    title: 'IV. Civil Service Eligibility',
    page: '2-3',
    content: (
      <div className="guide-body-text">
        <ul className="guide-list">
          <li>Indicate all civil service eligibilities earned with corresponding rating, date, and place of examination/conferment.</li>
          <li><strong>Examples:</strong>
            <ul className="guide-sublist">
              <li>Career Service Sub-Professional (EO 132/790 – Veteran Preference Rating)</li>
              <li>Career Service Professional (PD 907 – Honor Graduate)</li>
              <li>Career Service Executive / RA 7883 (Barangay Health Worker) / Barangay Official</li>
              <li>PD 997 (Scientific and Technological Specialist)</li>
            </ul>
          </li>
          <li><strong>License (RA 1080):</strong> If earned eligibility entails a license (e.g. PRC, Bar), indicate the license number and date of expiry (valid until).</li>
          <li>Use sheet C7 if additional rows are needed.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'sec5',
    title: 'V. Work Experience',
    page: '3',
    content: (
      <div className="guide-body-text">
        <ul className="guide-list">
          <li>Indicate all positions held in both public and private employment, starting from your current work.</li>
          <li><strong>Inclusive Dates:</strong> Numeric format: <code>DD/MM/YYYY</code>.</li>
          <li><strong>Full Position Titles &amp; Department/Agency/Company:</strong> Indicate FULL name. <strong>DO NOT ABBREVIATE</strong>.</li>
          <li><strong>Monthly Salary:</strong> In figures (e.g., <code>₱21,877.00</code>).</li>
          <li><strong>Salary / Job / Pay Grade &amp; Step:</strong> Format <code>00-0</code> (e.g., <code>24-2</code> for Salary Grade 24, Step 2).</li>
          <li><strong>Status of Employment:</strong> Permanent, temporary, casual, contractual, co-terminous.</li>
          <li><strong>Government Service:</strong> Indicate &ldquo;Yes&rdquo; if public/government employment, &ldquo;No&rdquo; if private.</li>
          <li><strong>Attachment:</strong> Accomplish and attach the Work Experience Sheet (WES) when applying for vacant positions.</li>
          <li>Use sheet C8 if additional rows are needed.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'sec6',
    title: 'VI. Voluntary Work',
    page: '3-4',
    content: (
      <div className="guide-body-text">
        <ul className="guide-list">
          <li>Indicate FULL name and complete address of the organization where you served as a volunteer.</li>
          <li>Inclusive dates: start (from) and end (to) in <code>DD/MM/YYYY</code>.</li>
          <li>Indicate total number of hours rendered and position/nature of voluntary work.</li>
          <li>Use sheet C9 if additional rows are needed.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'sec7',
    title: 'VII. Learning & Development (L&D)',
    page: '4',
    content: (
      <div className="guide-body-text">
        <ul className="guide-list">
          <li>Indicate FULL titles of all L&amp;D interventions attended, starting with the most recent.</li>
          <li>Dates in <code>DD/MM/YYYY</code> format and total hours attended.</li>
          <li>Indicate type of L&amp;D (managerial, supervisory, technical, foundation).</li>
          <li>Indicate FULL name of sponsoring institution (e.g. <code>Civil Service Commission</code>, not &ldquo;CSC&rdquo;).</li>
          <li>Use sheet C10 if additional rows are needed.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'sec8',
    title: 'VIII. Other Information & Declarations',
    page: '4-5',
    content: (
      <div className="guide-body-text">
        <ul className="guide-list">
          <li>Indicate special skills / hobbies, non-academic distinctions, and memberships in professional organizations in FULL.</li>
          <li><strong>Questions 34–40:</strong> Answer honestly on the right side of Page 4. Provide details or specifications for any &ldquo;Yes&rdquo; answer.</li>
          <li><strong>References (Item 41):</strong> Full name (<code>FIRST NAME, MI, SURNAME</code>), office/residential addresses, and contact numbers / email.</li>
          <li><strong>Item 42 Completion:</strong> Affix e-signature / digital certificate or right thumb mark. Provide government-issued ID number and date of issuance. Attach an unfiltered passport-sized digital photo (4.5 cm × 3.5 cm) taken within the last 6 months.</li>
        </ul>
        <div className="guide-callout tip">
          <CheckCircle2 size={16} />
          <span><strong>Printing Reminder:</strong> Print only the extra sheet/s (C5–C11) where additional information was entered.</span>
        </div>
      </div>
    ),
  },
];

export default function CSCGuideModal({open, onClose}: Props) {
  const [selectedSection, setSelectedSection] = useState(SECTIONS[0].id);
  const [searchQuery, setSearchQuery] = useState('');

  if (!open) return null;

  const filteredSections = SECTIONS.filter(
    s =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const active = SECTIONS.find(s => s.id === selectedSection) || SECTIONS[0];

  return (
    <div className="modal-backdrop guide-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="guide-modal" role="dialog" aria-modal="true" aria-labelledby="guide-title">
        {/* Header */}
        <div className="guide-header">
          <div className="guide-header-title">
            <span className="guide-icon-badge"><BookOpen size={20} /></span>
            <div>
              <h2 id="guide-title">Official Guide to Filling Out the PDS</h2>
              <p className="muted">Civil Service Commission (CSC) CS Form 212 · Revised 2026 Standards</p>
            </div>
          </div>
          <button type="button" className="text-button" onClick={onClose} aria-label="Close guide">
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="guide-search-bar">
          <Search size={16} className="guide-search-icon" />
          <input
            type="text"
            className="guide-search-input"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search guidelines (e.g. mother's maiden name, WES, RA 1080, N/A rule)..."
          />
        </div>

        {/* Two-Column Body: Navigation Sidebar + Reading View */}
        <div className="guide-layout">
          <nav className="guide-nav" aria-label="CSC Guide Sections">
            {filteredSections.map(sec => (
              <button
                key={sec.id}
                type="button"
                className={`guide-nav-item ${selectedSection === sec.id ? 'active' : ''}`}
                onClick={() => setSelectedSection(sec.id)}
              >
                <div className="guide-nav-item-title">{sec.title}</div>
                <div className="guide-nav-item-meta">
                  <span>Page {sec.page}</span>
                  <ChevronRight size={13} />
                </div>
              </button>
            ))}
          </nav>

          <main className="guide-content-panel">
            <div className="guide-content-head">
              <h3>{active.title}</h3>
              <span className="guide-page-pill">CSC PDS Guide · Page {active.page}</span>
            </div>
            {active.content}
          </main>
        </div>

        {/* Footer */}
        <div className="guide-footer">
          <span className="guide-footer-note">
            <FileText size={14} /> Entries must be computer-accomplished. Put N/A on blank items.
          </span>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Understood &amp; Back to Builder
          </button>
        </div>
      </div>
    </div>
  );
}
