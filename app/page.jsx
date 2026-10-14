"use client";
import { useEffect, useRef, useState } from "react";

const APPS = [
  { id: "a", label: "Space 01", color: "#547b68", tint: "#e2eee6", icon: "calendar" },
  { id: "b", label: "Space 02", color: "#527db6", tint: "#e4ecfa", icon: "book" },
  { id: "c", label: "Space 03", color: "#bb7566", tint: "#f7e8e2", icon: "users" },
  { id: "d", label: "Space 04", color: "#ad814c", tint: "#f7eddb", icon: "list" },
  { id: "e", label: "Space 05", color: "#b6759c", tint: "#f5e6f0", icon: "heart" },
  { id: "f", label: "Space 06", color: "#8875b6", tint: "#eee9fa", icon: "star" },
  { id: "g", label: "Space 07", color: "#3a9291", tint: "#e2f2f0", icon: "users" },
  { id: "h", label: "Space 08", color: "#a08068", tint: "#f1e8e1", icon: "list" }
];
const ROLES = ["Member", "Unit leader", "Group leader", "Pastoral Staff", "App administrator"];
const EVENTS = [
  { id: "next", title: "Upcoming activity", time: "7:30 PM", day: "Today", app: "a", note: "A sample item used to demonstrate the activity details panel." },
  { id: "second", title: "Another activity", time: "4:00 PM", day: "Tomorrow", app: "b", note: "A second fictional appointment for the mobile preview." },
  { id: "third", title: "Weekly reminder", time: "6:00 PM", day: "Thursday", app: "c", note: "A demonstration reminder, not an actual church assignment." }
];

function Glyph({ name, size = 21 }) {
  const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  const paths = {
    home: <path d="m3 11 9-8 9 8v9H3zM9 21v-7h6v7" />,
    apps: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></>,
    book: <><path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1ZM12 6v14"/></>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2m3-8a3 3 0 0 0 0-6m0 10a5 5 0 0 1 4 5"/></>,
    list: <><rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 10h6m-6 4h6m-6 4h4"/></>,
    heart: <path d="M20.5 8c0 5-8.5 11.5-8.5 11.5S3.5 13 3.5 8a4.4 4.4 0 0 1 8.5-1.4A4.4 4.4 0 0 1 20.5 8Z"/>,
    star: <path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z"/>,
    check: <path d="m4 12 5 5L20 6"/>,
    close: <path d="M5 5 19 19M19 5 5 19"/>,
    plus: <path d="M12 4v16M4 12h16"/>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
    back: <path d="m15 5-7 7 7 7"/>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/></>,
    user: <><circle cx="12" cy="8" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/></>,
    manage: <><rect x="3" y="6" width="18" height="15" rx="2"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-13 6h18"/></>
  };
  return <svg {...props}>{paths[name] || paths.info}</svg>;
}

const initialFavorites = ["a", "b", "c", "d", "e", "f"];
export default function Page() {
  const [screen, setScreen] = useState("home");
  const [dashboard, setDashboard] = useState("week");
  const [view, setView] = useState("today");
  const [selectedApp, setSelectedApp] = useState(APPS[0]);
  const [appView, setAppView] = useState("overview");
  const [sheet, setSheet] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(EVENTS[0]);
  const [role, setRole] = useState("Member");
  const [departmentManager, setDepartmentManager] = useState(false);
  const [favorites, setFavorites] = useState(initialFavorites);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState("");
  const [ready, setReady] = useState(false);
  const press = useRef(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("lvzion-official-favorites") || "null");
      if (Array.isArray(saved)) setFavorites([...new Set(saved.filter(id => APPS.some(a => a.id === id)))].slice(0, 8));
    } catch { /* Favorites are optional on restricted browsers. */ }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) try { localStorage.setItem("lvzion-official-favorites", JSON.stringify(favorites)); } catch { /* Optional */ }
  }, [favorites, ready]);
  useEffect(() => {
    if (!sheet) return;
    const keydown = e => { if (e.key === "Escape") setSheet(null); };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [sheet]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 3200);
    return () => clearTimeout(id);
  }, [toast]);

  const managed = role !== "Member" || departmentManager;
  const canManageApp = departmentManager && selectedApp.id === "a";
  const pinned = favorites.map(id => APPS.find(a => a.id === id)).filter(Boolean);

  function home() { setScreen("home"); setDashboard("week"); setView("today"); setSheet(null); setEditing(false); }
  function openApp(app) { setSelectedApp(app); setAppView("overview"); setScreen("app"); setSheet(null); setEditing(false); }
  function detail(event) { setSelectedEvent(event); setSheet("activity"); }
  function toggle(id) {
    if (favorites.includes(id)) setFavorites(current => current.filter(x => x !== id));
    else if (favorites.length === 8) setToast("You can pin up to eight favorites.");
    else setFavorites(current => [...current, id]);
  }
  function reorder(id, move) {
    setFavorites(current => {
      const list = [...current], index = list.indexOf(id), next = index + move;
      if (index < 0 || next < 0 || next >= list.length) return current;
      [list[index], list[next]] = [list[next], list[index]];
      return list;
    });
  }
  function clearPress() { if (press.current) clearTimeout(press.current); press.current = null; }
  function startPress() { clearPress(); press.current = setTimeout(() => setEditing(true), 550); }
  function tile(app) {
    const isPinned = favorites.includes(app.id);
    return <div className="app-tile" key={app.id}>
      <button className="app-tile-btn" type="button" onClick={() => { if (!editing) openApp(app); }} onPointerDown={startPress} onPointerUp={clearPress} onPointerLeave={clearPress} onPointerCancel={clearPress} onContextMenu={e => { e.preventDefault(); setEditing(true); }}>
        <span className="app-icon" style={{ background: app.tint, color: app.color }}><Glyph name={app.icon} size={25}/></span>
        <span>{app.label}</span>
      </button>
      {editing && <div className="edit-actions">
        <button type="button" aria-label={(isPinned ? "Remove " : "Pin ") + app.label} onClick={() => toggle(app.id)}><Glyph name={isPinned ? "close" : "plus"} size={14}/></button>
        {isPinned && <><button type="button" aria-label={"Move " + app.label + " earlier"} onClick={() => reorder(app.id, -1)}>↑</button><button type="button" aria-label={"Move " + app.label + " later"} onClick={() => reorder(app.id, 1)}>↓</button></>}
      </div>}
    </div>;
  }
  function appBtn(app) { return <button className="app-list-item" key={app.id} onClick={() => openApp(app)}>
    <span className="app-icon app-icon-small" style={{ background: app.tint, color: app.color }}><Glyph name={app.icon}/></span>
    <span><strong>{app.label}</strong><small>Sample app, not approved</small></span><Glyph name="arrow" size={16}/>
  </button>; }
  function navButton(title, name, active, action) {
    return <button className={active ? "is-active" : ""} onClick={action} type="button" aria-current={active ? "page" : undefined}><Glyph name={name}/><small>{title}</small></button>;
  }
  return <main className="app-stage"><div className="mobile-shell">
    <header className="top-bar">
      {screen === "app"
        ? <button className="back-home" onClick={home}><Glyph name="back" size={19}/> LV Zion</button>
        : <div className="brand"><strong>LV ZION</strong><small>YOUR CONNECTED COMMUNITY</small></div>}
      <button className="profile-button" aria-label="Preview profile and roles" onClick={() => setSheet("profile")}><Glyph name="user"/></button>
    </header>
    <div className="main-scroll">
      {screen === "home" && <>
        <section className="welcome"><span className="eyebrow">PERSONAL HOME · PREVIEW</span><h1>Welcome back<span>.</span></h1><p>Your week, all in one place.</p></section>
        {managed && <div className="segmented" role="tablist" aria-label="Dashboard mode"><button className={dashboard === "week" ? "on" : ""} role="tab" aria-selected={dashboard === "week"} onClick={() => setDashboard("week")}>My Week</button><button className={dashboard === "manage" ? "on" : ""} role="tab" aria-selected={dashboard === "manage"} onClick={() => setDashboard("manage")}>Manage</button></div>}
        {dashboard === "week" || !managed ? <>
          <div className="section-title"><h2>My Week</h2><small>Fictional activities</small></div>
          <div className="segmented compact" role="tablist" aria-label="Calendar view">{["today","week","calendar"].map(v => <button key={v} role="tab" aria-selected={view === v} className={view === v ? "on" : ""} onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>)}</div>
          {view === "week" && <div className="week-grid">{["M","T","W","T","F","S","S"].map((day,i) => <div className={i === 1 ? "selected" : ""} key={i}><small>{day}</small><strong>{12+i}</strong></div>)}</div>}
          {view === "calendar" ? <div className="calendar-view"><h3>October 2026 · Preview</h3><div className="calendar-grid">{["M","T","W","T","F","S","S"].map((day,i) => <small key={i}>{day}</small>)}{Array.from({length:3},(_,i)=><span key={"b"+i}/>)}{Array.from({length:31},(_,i) => <button type="button" className={i === 12 ? "today" : ""} key={i} onClick={() => setToast("The calendar is not connected to actual schedules.")}>{i+1}</button>)}</div></div> : <>
            <button type="button" className="featured-activity" onClick={() => detail(EVENTS[0])}><span className="eyebrow"><Glyph name="clock" size={15}/> NEXT UP</span><span className="feature-time">7:30 <small>PM</small><Glyph name="arrow" size={25}/></span><strong>Upcoming activity</strong><span className="muted">Today · Example only</span></button>
            {EVENTS.slice(1).map((event,i) => <button type="button" className="activity-row" key={event.id} onClick={() => detail(event)}><span className="date-chip">{i === 0 ? "WED" : "THU"}<strong>{14+i}</strong></span><span className="row-body"><strong>{event.title}</strong><small>{event.time} · Demo item</small></span><Glyph name="arrow" size={16}/></button>)}
          </>}
          <div className="section-title"><h2>Favorite apps</h2><button className="text-button" type="button" onClick={() => setEditing(!editing)}>{editing ? "Done" : "Edit"}</button></div>
          <div className="app-grid">{pinned.map(tile)}</div>
          <button className="browse-apps" onClick={() => {setEditing(false); setSheet("apps");}}>Browse all apps <Glyph name="arrow" size={17}/></button>
        </> : <>
          <div className="section-title"><h2>Needs attention</h2><span className="count-pill">2 samples</span></div>
          {["Pending request","Upcoming responsibility"].map((title,i) => <button className="activity-row" type="button" key={title} onClick={() => setToast("Example only. Nothing was changed.")}><span className="round-icon"><Glyph name={i ? "bell" : "manage"}/></span><span className="row-body"><strong>{title}</strong><small>Demonstration management item</small></span><Glyph name="arrow" size={16}/></button>)}
          <div className="section-title"><h2>Your responsibilities</h2></div>
          {role !== "Member" && <div className="activity-row"><span className="round-icon"><Glyph name="users"/></span><span className="row-body"><strong>{role}</strong><small>Organizational responsibility</small></span></div>}
          {departmentManager && <button className="activity-row" onClick={() => openApp(APPS[0])}><span className="round-icon"><Glyph name="manage"/></span><span className="row-body"><strong>Example department</strong><small>Manage is inside Space 01</small></span><Glyph name="arrow" size={16}/></button>}
        </>}
        <p className="disclaimer">PRIVATE CONCEPT PREVIEW · SYNTHETIC DATA ONLY</p>
      </>}
      {screen === "notifications" && <div className="inner-page"><span className="eyebrow">YOUR UPDATES</span><h1>Notifications</h1><div className="section-title"><h2>Needs action</h2><span className="count-pill">1 example</span></div><button className="activity-row" onClick={() => detail(EVENTS[0])}><span className="round-icon"><Glyph name="bell"/></span><span className="row-body"><strong>Sample activity update</strong><small>Tap to see details</small></span><Glyph name="arrow" size={16}/></button><div className="section-title"><h2>Recent updates</h2></div><button className="activity-row" onClick={() => openApp(APPS[1])}><span className="round-icon"><Glyph name="info"/></span><span className="row-body"><strong>Example notification</strong><small>Opens the related space</small></span><Glyph name="arrow" size={16}/></button><p className="disclaimer">NO NOTIFICATIONS WERE SENT</p></div>}
      {screen === "app" && <div className="inner-page app-page" style={{"--accent": selectedApp.color}}>
        <span className="app-icon" style={{background: selectedApp.tint,color:selectedApp.color}}><Glyph name={selectedApp.icon} size={28}/></span><span className="eyebrow">PLACEHOLDER APP · PREVIEW</span><h1>{selectedApp.label}</h1><p>Official applications will be chosen and designed separately.</p>
        <div className="empty-state"><Glyph name={appView === "manage" ? "manage" : selectedApp.icon} size={35}/><h2>{appView === "manage" ? "Manage this space" : appView === "updates" ? "Updates" : "Welcome to your space"}</h2><p>{appView === "manage" ? "This tab appears only when a person is assigned department management rights in this app." : "The shared navigation is interactive. No member information is connected."}</p><button onClick={() => setSheet("apps")}>Switch apps <Glyph name="arrow" size={16}/></button></div>
        <p className="disclaimer">NO REAL MEMBERS OR ACTIVITIES</p>
      </div>}
    </div>
    <nav className="bottom-nav" aria-label="Main navigation">
      {screen === "app" ? <>
        {navButton("Overview","home",appView === "overview",() => setAppView("overview"))}
        {navButton("Updates","bell",appView === "updates",() => setAppView("updates"))}
        <button className="center-apps" aria-label="Open apps" onClick={() => {setEditing(false);setSheet("apps");}}><Glyph name="apps" size={24}/><small>Apps</small></button>
        {canManageApp ? navButton("Manage","manage",appView === "manage",() => setAppView("manage")) : <span/>}
        {navButton("More","user",false,() => setSheet("profile"))}
      </> : <>
        {navButton("Home","home",screen === "home",home)}<span/>
        <button className="center-apps" aria-label="Open apps" onClick={() => {setEditing(false);setSheet("apps");}}><Glyph name="apps" size={24}/><small>Apps</small></button><span/>
        {navButton("Notifications","bell",screen === "notifications",() => setScreen("notifications"))}
      </>}
    </nav>
    {sheet && <div className="overlay" onClick={() => setSheet(null)}><section className="sheet" role="dialog" aria-modal="true" aria-label={sheet === "apps" ? "Available applications" : sheet === "profile" ? "Preview settings" : "Activity details"} onClick={e => e.stopPropagation()}>
      <div className="grabber"/><div className="sheet-header"><div><span className="eyebrow">LV ZION · DEMO</span><h2>{sheet === "apps" ? "Your apps" : sheet === "profile" ? "Preview settings" : selectedEvent.title}</h2></div><button className="close-sheet" aria-label="Close" onClick={() => setSheet(null)}><Glyph name="close"/></button></div>
      <div className="sheet-scroll">{sheet === "apps" && <>
        <div className="section-title"><h3>Favorites</h3><button className="text-button" onClick={() => setEditing(!editing)}>{editing ? "Done" : "Edit"}</button></div>
        <div className="app-grid">{pinned.map(tile)}</div>
        <div className="section-title"><h3>All available apps</h3></div>
        <div className="app-list">{APPS.map(app => <div key={app.id} className="app-list-row">{appBtn(app)}{editing && <button className="pin-btn" onClick={() => toggle(app.id)} aria-label={(favorites.includes(app.id)?"Unpin ":"Pin ")+app.label}><Glyph name={favorites.includes(app.id)?"check":"plus"}/></button>}</div>)}</div>
      </>}
      {sheet === "profile" && <><p className="sheet-copy">Preview how the dashboard changes with different positions. This is not real authentication.</p><label className="select-label">Preview as<select value={role} onChange={e => {setRole(e.target.value);setDashboard("week");}}>{ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select></label><label className="check-label"><input type="checkbox" checked={departmentManager} onChange={e => {setDepartmentManager(e.target.checked);setDashboard("week");setAppView("overview");}}/>Also assigned to manage Space 01</label><p className="small-print">Group leadership does not automatically grant department-management access.</p><button className="primary-button" onClick={() => setSheet(null)}>Done <Glyph name="check"/></button></>}
      {sheet === "activity" && <><span className="time-pill"><Glyph name="calendar" size={16}/>{selectedEvent.day} · {selectedEvent.time}</span><p className="sheet-copy">{selectedEvent.note}</p><button className="primary-button" onClick={() => openApp(APPS.find(a => a.id === selectedEvent.app) || APPS[0])}>Open example app <Glyph name="arrow"/></button><button className="secondary-button" onClick={() => setToast("Demo only: no calendar change was made.")}>Add to calendar <Glyph name="calendar"/></button><p className="small-print">This preview is not connected to real calendars, accounts, or assignments.</p></>}
      </div>
    </section></div>}
    {toast && <div className="toast" role="status">{toast}</div>}
  </div></main>;
}