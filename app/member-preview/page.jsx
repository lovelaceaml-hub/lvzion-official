"use client";

import { useState } from "react";
import "./member-preview.css";

const PEOPLE = [
  { id: "ava", name: "Ava Brooks", initials: "AB", category: "Category A", group: "Group 1", unit: "Unit 1", role: "Member", departments: ["Sample Department A"] },
  { id: "eli", name: "Eli Rowan", initials: "ER", category: "Category A", group: "Group 1", unit: "Unit 1", role: "Unit Leader", departments: [] },
  { id: "noor", name: "Noor Ellis", initials: "NE", category: "Category A", group: "Group 1", unit: "Unit 2", role: "Group Leader", departments: ["Sample Department B"] },
  { id: "priya", name: "Priya Wells", initials: "PW", category: "Category B", group: "Group 2", unit: "Unit 1", role: "Department Manager", departments: ["Sample Department A"] },
  { id: "felix", name: "Felix Stone", initials: "FS", category: "Category B", group: "Group 2", unit: "Unit 1", role: "App Administrator", departments: [] },
  { id: "mira", name: "Mira Quinn", initials: "MQ", category: "Category A", group: "Group 1", unit: "Unit 1", role: "Pastoral Staff", departments: [] }
];

const MANAGEMENT = {
  "Unit Leader": { heading: "Your unit", detail: "Manage approved member fields in your assigned unit.", access: "Unit 1 only" },
  "Group Leader": { heading: "Your group", detail: "Oversee approved member fields across your assigned group.", access: "Group 1 only" },
  "Department Manager": { heading: "Your department", detail: "Manage assignments inside your authorized department only.", access: "Sample Department A only" },
  "App Administrator": { heading: "Technical administration", detail: "Manage application configuration, not ministry records.", access: "Technical settings only" },
  "Pastoral Staff": { heading: "Church oversight", detail: "Use church-management privileges only within explicitly granted authority.", access: "Explicitly assigned pastoral scope" }
};

function Avatar({ person, large = false }) {
  return <span className={large ? "ld-avatar ld-avatar-large" : "ld-avatar"} aria-hidden="true">{person.initials}</span>;
}

export default function MemberPreviewPage() {
  const [personId, setPersonId] = useState("ava");
  const [page, setPage] = useState("signin");
  const [notice, setNotice] = useState("");
  const member = PEOPLE.find((p) => p.id === personId) || PEOPLE[0];
  const management = MANAGEMENT[member.role];
  const groupMembers = PEOPLE.filter((p) => p.group === member.group);

  function switchPerson(e) {
    const nextId = e.target.value;
    setPersonId(nextId);
    const next = PEOPLE.find((p) => p.id === nextId);
    if (!MANAGEMENT[next?.role] && page === "manage") setPage("profile");
    setNotice("");
  }

  function demoAction() {
    setNotice("Preview only — no database changes were made.");
  }

  return <main className="ld-outer">
    <div className="ld-shell">
      <div className="ld-demo-banner">FICTIONAL MEMBER PREVIEW · NO REAL SIGN-IN OR DATA</div>
      {page === "signin" ? (
        <section className="ld-signin">
          <div className="ld-signin-mark">LV</div>
          <span className="ld-eyebrow">LAS VEGAS ZION · APP CONCEPT</span>
          <h1>Welcome to<br />your community.</h1>
          <p className="ld-muted">This is a preview of the future member sign-in experience. The fields are disabled so nobody can submit real credentials.</p>
          <div className="ld-signin-card">
            <h2>Member sign-in</h2>
            <label>Username or email<input type="text" placeholder="Available when authentication is implemented" disabled autoComplete="off" /></label>
            <label>Password<input type="password" placeholder="Not active in this preview" disabled autoComplete="off" /></label>
            <button className="ld-primary" onClick={() => setPage("profile")} type="button">Explore fictional member <span aria-hidden="true">→</span></button>
            <p className="ld-caption">No password is collected. The preview button is not authentication.</p>
          </div>
          <p className="ld-bottom-caption">Selected domain: lvz.app (registration on hold)</p>
        </section>
      ) : (
        <>
          <header className="ld-header">
            <div className="ld-brand"><span>LV ZION</span><small>Member experience</small></div>
            <button className="ld-signout" type="button" onClick={() => { setPage("signin"); setNotice(""); }}>Exit demo</button>
          </header>
          <section className="ld-person-picker">
            <label htmlFor="ld-person">PREVIEW AS</label>
            <select id="ld-person" value={personId} onChange={switchPerson}>
              {PEOPLE.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.role}</option>)}
            </select>
          </section>
          <div className="ld-content">
            {page === "profile" && <>
              <span className="ld-eyebrow">MY MEMBER PROFILE</span>
              <div className="ld-profile-hero"><Avatar person={member} large /><div><h1>{member.name}</h1><p>{member.role}</p></div></div>
              <div className="ld-card">
                <div className="ld-card-top"><h2>Church placement</h2><span className="ld-status">Active · demo</span></div>
                <dl className="ld-detail-grid">
                  <div><dt>Age category</dt><dd>{member.category}</dd></div>
                  <div><dt>Group</dt><dd>{member.group}</dd></div>
                  <div><dt>Unit</dt><dd>{member.unit}</dd></div>
                  <div><dt>Position</dt><dd>{member.role}</dd></div>
                </dl>
              </div>
              <div className="ld-card">
                <h2>Department membership</h2>
                {member.departments.length
                  ? <div className="ld-tags">{member.departments.map((d) => <span className="ld-tag" key={d}>{d}</span>)}</div>
                  : <p className="ld-muted">No departments assigned in this sample.</p>}
                <p className="ld-card-note">Department assignments do not automatically give group leadership access.</p>
              </div>
              <div className="ld-card ld-card-slim">
                <h2>Your access</h2>
                <p>{management ? management.detail : "View your own profile and the names-only directory for your own group."}</p>
                <button className="ld-subtle-link" type="button" onClick={() => setPage(management ? "manage" : "directory")}>View permitted area →</button>
              </div>
            </>}
            {page === "directory" && <>
              <span className="ld-eyebrow">GROUP DIRECTORY · NAMES ONLY</span>
              <h1>{member.group}</h1>
              <p className="ld-muted">As {member.name}, you can preview the names of members in your own group. Contact details are never shown here.</p>
              <div className="ld-card ld-directory">
                {groupMembers.map((p) => <div className="ld-person-row" key={p.id}><Avatar person={p}/><div><strong>{p.name}</strong><small>{p.unit}</small></div></div>)}
              </div>
              <p className="ld-security-note">Group membership determines directory scope. This fictional preview is not a security test; the live app will enforce that rule in the database and server.</p>
            </>}
            {page === "manage" && management && <>
              <span className="ld-eyebrow">ASSIGNED RESPONSIBILITY</span>
              <h1>{management.heading}</h1>
              <p className="ld-muted">{management.detail}</p>
              <div className="ld-card">
                <div className="ld-card-top"><h2>Permitted scope</h2><span className="ld-status">Demo role</span></div>
                <p className="ld-scope">{management.access}</p>
                <p className="ld-card-note">A software administrator cannot read ministry information without a separate approved church responsibility.</p>
              </div>
              <div className="ld-card"><h2>Example actions</h2>
                <button type="button" className="ld-action-row" onClick={demoAction}>View permitted assignments <span aria-hidden="true">→</span></button>
                <button type="button" className="ld-action-row" onClick={demoAction}>Open pending requests <span aria-hidden="true">→</span></button>
                <button type="button" className="ld-action-row" onClick={demoAction}>View activity history <span aria-hidden="true">→</span></button>
                <p className="ld-caption">The buttons are visual demonstrations. No records can be edited.</p>
              </div>
            </>}
          </div>
          <nav className="ld-nav" aria-label="Member preview navigation">
            <button type="button" className={page === "profile" ? "ld-on" : ""} onClick={() => setPage("profile")}><span aria-hidden="true">◉</span>Profile</button>
            <button type="button" className={page === "directory" ? "ld-on" : ""} onClick={() => setPage("directory")}><span aria-hidden="true">☷</span>My group</button>
            {management && <button type="button" className={page === "manage" ? "ld-on" : ""} onClick={() => setPage("manage")}><span aria-hidden="true">▣</span>Manage</button>}
          </nav>
          {notice && <div className="ld-toast" role="status">{notice}</div>}
        </>
      )}
    </div>
  </main>;
}
