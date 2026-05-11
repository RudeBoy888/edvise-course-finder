import React, { useState, useRef } from 'react';
import { parseExcelToCricosData } from '../utils/excelParser';
import { compareCricosData, compareLevels } from '../utils/cricosComparator';
import { commitFile, validateToken, appendHistory } from '../utils/githubPublisher';
import '../styles/CricosUpdatePanel.css';

const STORAGE_KEY = 'edvise_github_token';
const LEVEL_LABELS = { 1: 'Level 1', 2: 'Level 2', 3: 'Level 3', null: 'Unknown' };

// ── Shared helpers ─────────────────────────────────────────────────────────

function DiffSummaryCard({ label, value, color }) {
  return (
    <div className="cup-stat" style={{ borderTop: `3px solid ${color}` }}>
      <span className="cup-stat-value" style={{ color }}>{value}</span>
      <span className="cup-stat-label">{label}</span>
    </div>
  );
}

function ExpandableList({ title, items, renderItem, emptyText }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, 5);
  if (items.length === 0) return null;
  return (
    <div className="cup-expandable">
      <div className="cup-expandable-header" onClick={() => setExpanded(!expanded)}>
        <span>{title} ({items.length})</span>
        <span className="cup-arrow">{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div className="cup-expandable-body">
          {visible.map((item, i) => <div key={i} className="cup-list-item">{renderItem(item)}</div>)}
          {!expanded && items.length > 5 && (
            <button className="cup-show-more" onClick={() => setExpanded(true)}>
              Show {items.length - 5} more...
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function DropZone({ accept, label, hint, onFile, disabled }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();
  const handle = (file) => { if (file) onFile(file); };
  return (
    <div
      className={`cup-dropzone ${dragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
      onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); if (!disabled) handle(e.dataTransfer.files[0]); }}
      onClick={() => !disabled && inputRef.current.click()}
    >
      <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }}
        onChange={e => handle(e.target.files[0])} />
      <div className="cup-dropzone-icon">⬆</div>
      <div className="cup-dropzone-label">{label}</div>
      {hint && <div className="cup-dropzone-hint">{hint}</div>}
    </div>
  );
}

// ── GitHub Token Setup ─────────────────────────────────────────────────────

function TokenSetup({ onSaved }) {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!token.trim()) return;
    setLoading(true);
    setStatus(null);
    try {
      const user = await validateToken(token.trim());
      localStorage.setItem(STORAGE_KEY, token.trim());
      setStatus({ ok: true, msg: `Connected as ${user.login}` });
      setTimeout(() => onSaved(token.trim()), 800);
    } catch (e) {
      setStatus({ ok: false, msg: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cup-token-setup">
      <h3>GitHub Token Required</h3>
      <p>To publish changes directly to GitHub, you need a Personal Access Token.</p>
      <ol className="cup-token-steps">
        <li>Go to <strong>github.com → Settings → Developer settings → Personal access tokens → Fine-grained tokens</strong></li>
        <li>Create new token, select repository: <strong>edvise-course-finder</strong></li>
        <li>Permissions: <strong>Contents → Read and Write</strong></li>
        <li>Copy and paste below</li>
      </ol>
      <div className="cup-token-input-row">
        <input
          type="password"
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="github_pat_..."
          className="cup-token-input"
          onKeyDown={e => e.key === 'Enter' && handleSave()}
        />
        <button className="cup-btn primary" onClick={handleSave} disabled={loading || !token.trim()}>
          {loading ? 'Checking...' : 'Save & Connect'}
        </button>
      </div>
      {status && (
        <div className={`cup-status ${status.ok ? 'success' : 'error'}`}>{status.msg}</div>
      )}
      <p className="cup-token-note">Token is stored only in your browser (localStorage). Never shared.</p>
    </div>
  );
}

// ── CRICOS Data Update Tab ─────────────────────────────────────────────────

function CricosDataUpdate({ githubToken }) {
  const [step, setStep] = useState('upload'); // upload | parsing | review | publishing | done
  const [file, setFile] = useState(null);
  const [diff, setDiff] = useState(null);
  const [newData, setNewData] = useState(null);
  const [error, setError] = useState(null);
  const [publishMsg, setPublishMsg] = useState('');

  const handleFile = async (f) => {
    if (!f.name.endsWith('.xlsx')) { setError('Please upload an .xlsx file'); return; }
    setFile(f);
    setError(null);
    setStep('parsing');
    try {
      const currentRes = await fetch('/courses_data.json');
      const currentData = await currentRes.json();
      const parsed = await parseExcelToCricosData(f, currentData);
      const diffResult = compareCricosData(currentData, parsed);
      setNewData(parsed);
      setDiff(diffResult);
      setStep('review');
    } catch (e) {
      setError(e.message);
      setStep('upload');
    }
  };

  const handlePublish = async () => {
    setStep('publishing');
    setPublishMsg('Encoding data...');
    try {
      const json = JSON.stringify(newData, null, 2);
      setPublishMsg('Uploading to GitHub...');
      const date = new Date().toISOString().split('T')[0];
      const time = new Date().toTimeString().slice(0, 5);
      const stats = diff.stats;
      await commitFile(
        githubToken,
        'public/courses_data.json',
        json,
        `Update CRICOS data ${date} — ${stats.institutionsNew} institutions, ${stats.coursesNew} courses`
      );
      setPublishMsg('Saving history...');
      await appendHistory(githubToken, {
        type: 'cricos',
        date,
        time,
        totalInstitutions: stats.institutionsNew,
        totalCourses: stats.coursesNew,
        addedCourses: diff.addedCourses.length,
        removedCourses: diff.removedCourses.length,
        modifiedCourses: diff.modifiedCourses.length,
        addedInstitutions: diff.addedInstitutions.length,
        removedInstitutions: diff.removedInstitutions.length,
      });
      setPublishMsg('');
      setStep('done');
    } catch (e) {
      setError(e.message);
      setStep('review');
    }
  };

  const reset = () => { setStep('upload'); setFile(null); setDiff(null); setNewData(null); setError(null); };

  if (step === 'parsing') return (
    <div className="cup-center">
      <div className="cup-spinner" />
      <p>Parsing Excel file... This may take 10-30 seconds for large files.</p>
    </div>
  );

  if (step === 'publishing') return (
    <div className="cup-center">
      <div className="cup-spinner" />
      <p>{publishMsg || 'Publishing to GitHub...'}</p>
    </div>
  );

  if (step === 'done') return (
    <div className="cup-center">
      <div className="cup-success-icon">✓</div>
      <h3>Published Successfully!</h3>
      <p>Vercel will deploy the update in 2-3 minutes.</p>
      <div className="cup-done-stats">
        <span>{diff.stats.institutionsNew} institutions</span>
        <span>{diff.stats.coursesNew.toLocaleString()} courses</span>
        <span>+{diff.addedCourses.length} added</span>
        <span>-{diff.removedCourses.length} removed</span>
      </div>
      <button className="cup-btn secondary" onClick={reset}>Upload Another</button>
    </div>
  );

  if (step === 'review' && diff) return (
    <div className="cup-review">
      <h3>Review Changes — {file.name}</h3>
      <div className="cup-stats-row">
        <DiffSummaryCard label="New courses" value={`+${diff.addedCourses.length}`} color="#28a745" />
        <DiffSummaryCard label="Removed courses" value={`-${diff.removedCourses.length}`} color="#dc3545" />
        <DiffSummaryCard label="Modified courses" value={diff.modifiedCourses.length} color="#ffc107" />
        <DiffSummaryCard label="New institutions" value={`+${diff.addedInstitutions.length}`} color="#28a745" />
        <DiffSummaryCard label="Total courses" value={diff.stats.coursesNew.toLocaleString()} color="#C7613C" />
      </div>

      <ExpandableList
        title="New institutions"
        items={diff.addedInstitutions}
        renderItem={i => <><strong>{i.name}</strong> ({i.providerCode}) — {i.courseCount} courses</>}
      />
      <ExpandableList
        title="Removed institutions"
        items={diff.removedInstitutions}
        renderItem={i => <><strong>{i.name}</strong> ({i.providerCode}) — {i.courseCount} courses</>}
      />
      <ExpandableList
        title="New courses"
        items={diff.addedCourses}
        renderItem={c => <>{c.courseName} — <em>{c.institutionName}</em></>}
      />
      <ExpandableList
        title="Removed courses"
        items={diff.removedCourses}
        renderItem={c => <>{c.courseName} — <em>{c.institutionName}</em></>}
      />
      <ExpandableList
        title="Modified courses"
        items={diff.modifiedCourses}
        renderItem={c => (
          <>
            <strong>{c.courseName}</strong> — {c.institutionName}
            <div className="cup-changes">
              {c.changes.map((ch, i) => (
                <span key={i} className="cup-change-tag">{ch.field}: {String(ch.old)} → {String(ch.new)}</span>
              ))}
            </div>
          </>
        )}
      />

      {error && <div className="cup-status error">{error}</div>}

      <div className="cup-review-actions">
        <button className="cup-btn secondary" onClick={reset}>Cancel</button>
        <button className="cup-btn primary" onClick={handlePublish}>
          Apply Changes & Deploy
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <p className="cup-description">
        Upload the new CRICOS Excel file (<code>.xlsx</code>). The app will parse it, compare with current data, show you exactly what changed, and deploy with one click.
      </p>
      {error && <div className="cup-status error">{error}</div>}
      <DropZone
        accept=".xlsx"
        label="Drop CRICOS Excel file here"
        hint="cricos_data_current.xlsx — drag & drop or click to select"
        onFile={handleFile}
      />
    </div>
  );
}

// ── Assessment Levels Update Tab ───────────────────────────────────────────

function LevelsDiff({ diff, type }) {
  const label = type === 'provider' ? 'school' : 'country';
  const nameKey = type === 'provider' ? 'providerName' : 'countryName';
  return (
    <div>
      <div className="cup-stats-row">
        <DiffSummaryCard label="Level changes" value={diff.changes.length} color="#ffc107" />
        <DiffSummaryCard label={`New ${label}s`} value={`+${diff.added.length}`} color="#28a745" />
        <DiffSummaryCard label={`Removed ${label}s`} value={`-${diff.removed.length}`} color="#dc3545" />
      </div>
      <ExpandableList
        title="Level changes"
        items={diff.changes}
        renderItem={c => (
          <>
            <strong>{c.name}</strong> ({c.code})
            <span className="cup-level-change">
              {LEVEL_LABELS[c.oldLevel]} → {LEVEL_LABELS[c.newLevel]}
            </span>
          </>
        )}
      />
      <ExpandableList
        title={`New ${label}s`}
        items={diff.added}
        renderItem={c => <><strong>{c.name}</strong> ({c.code}) — {LEVEL_LABELS[c.level]}</>}
      />
      <ExpandableList
        title={`Removed ${label}s`}
        items={diff.removed}
        renderItem={c => <><strong>{c.name}</strong> ({c.code})</>}
      />
    </div>
  );
}

function AssessmentLevelsUpdate({ githubToken }) {
  const [providerFile, setProviderFile] = useState(null);
  const [countryFile, setCountryFile] = useState(null);
  const [providerDiff, setProviderDiff] = useState(null);
  const [countryDiff, setCountryDiff] = useState(null);
  const [providerNew, setProviderNew] = useState(null);
  const [countryNew, setCountryNew] = useState(null);
  const [step, setStep] = useState('upload'); // upload | review | publishing | done
  const [error, setError] = useState(null);

  const loadJsonFile = async (file) => {
    const text = await file.text();
    return JSON.parse(text);
  };

  const handleProviderFile = async (f) => {
    setError(null);
    try {
      const newLevels = await loadJsonFile(f);
      const currentRes = await fetch('/provider_levels.json');
      const currentLevels = await currentRes.json();
      setProviderNew(newLevels);
      setProviderDiff(compareLevels(currentLevels, newLevels));
      setProviderFile(f);
    } catch (e) {
      setError(`Provider levels: ${e.message}`);
    }
  };

  const handleCountryFile = async (f) => {
    setError(null);
    try {
      const newLevels = await loadJsonFile(f);
      const currentRes = await fetch('/country_levels.json');
      const currentLevels = await currentRes.json();
      setCountryNew(newLevels);
      setCountryDiff(compareLevels(currentLevels, newLevels));
      setCountryFile(f);
    } catch (e) {
      setError(`Country levels: ${e.message}`);
    }
  };

  const canReview = providerDiff || countryDiff;

  const handlePublish = async () => {
    setStep('publishing');
    const date = new Date().toISOString().split('T')[0];
    const time = new Date().toTimeString().slice(0, 5);
    try {
      if (providerNew) {
        await commitFile(
          githubToken,
          'public/provider_levels.json',
          JSON.stringify(providerNew, null, 2),
          `Update provider assessment levels ${date}`
        );
      }
      if (countryNew) {
        await commitFile(
          githubToken,
          'public/country_levels.json',
          JSON.stringify(countryNew, null, 2),
          `Update country assessment levels ${date}`
        );
      }
      await appendHistory(githubToken, {
        type: 'levels',
        date,
        time,
        providerChanges: providerDiff?.changes.length ?? 0,
        providerAdded: providerDiff?.added.length ?? 0,
        providerRemoved: providerDiff?.removed.length ?? 0,
        countryChanges: countryDiff?.changes.length ?? 0,
        countryAdded: countryDiff?.added.length ?? 0,
        countryRemoved: countryDiff?.removed.length ?? 0,
      });
      setStep('done');
    } catch (e) {
      setError(e.message);
      setStep('review');
    }
  };

  const reset = () => {
    setProviderFile(null); setCountryFile(null);
    setProviderDiff(null); setCountryDiff(null);
    setProviderNew(null); setCountryNew(null);
    setStep('upload'); setError(null);
  };

  if (step === 'publishing') return (
    <div className="cup-center">
      <div className="cup-spinner" />
      <p>Publishing assessment levels to GitHub...</p>
    </div>
  );

  if (step === 'done') return (
    <div className="cup-center">
      <div className="cup-success-icon">✓</div>
      <h3>Assessment Levels Updated!</h3>
      <p>Vercel will deploy the update in 2-3 minutes.</p>
      <button className="cup-btn secondary" onClick={reset}>Upload Another</button>
    </div>
  );

  return (
    <div>
      <p className="cup-description">
        After running <code>node scripts/check-provider-levels.js --countries</code> locally, upload the generated JSON files here to compare and deploy.
      </p>

      <div className="cup-levels-grid">
        <div className="cup-levels-zone">
          <h4>Schools (provider_levels.json)</h4>
          {providerFile ? (
            <div className="cup-file-loaded">
              <span className="cup-file-icon">JSON</span>
              <span>{providerFile.name}</span>
              <button className="cup-btn-xs" onClick={() => { setProviderFile(null); setProviderDiff(null); setProviderNew(null); }}>✕</button>
            </div>
          ) : (
            <DropZone
              accept=".json"
              label="Drop provider_levels.json"
              hint="Output of check-provider-levels.js"
              onFile={handleProviderFile}
            />
          )}
          {providerDiff && (
            <div className="cup-mini-diff">
              <span className="cup-mini-stat green">+{providerDiff.added.length} new</span>
              <span className="cup-mini-stat yellow">{providerDiff.changes.length} changed</span>
              <span className="cup-mini-stat red">-{providerDiff.removed.length} removed</span>
            </div>
          )}
        </div>

        <div className="cup-levels-zone">
          <h4>Countries (country_levels.json)</h4>
          {countryFile ? (
            <div className="cup-file-loaded">
              <span className="cup-file-icon">JSON</span>
              <span>{countryFile.name}</span>
              <button className="cup-btn-xs" onClick={() => { setCountryFile(null); setCountryDiff(null); setCountryNew(null); }}>✕</button>
            </div>
          ) : (
            <DropZone
              accept=".json"
              label="Drop country_levels.json"
              hint="Use --countries flag on the script"
              onFile={handleCountryFile}
            />
          )}
          {countryDiff && (
            <div className="cup-mini-diff">
              <span className="cup-mini-stat green">+{countryDiff.added.length} new</span>
              <span className="cup-mini-stat yellow">{countryDiff.changes.length} changed</span>
              <span className="cup-mini-stat red">-{countryDiff.removed.length} removed</span>
            </div>
          )}
        </div>
      </div>

      {canReview && (
        <div className="cup-levels-detail">
          {providerDiff && <><h4>School Level Changes</h4><LevelsDiff diff={providerDiff} type="provider" /></>}
          {countryDiff && <><h4>Country Level Changes</h4><LevelsDiff diff={countryDiff} type="country" /></>}
        </div>
      )}

      {error && <div className="cup-status error">{error}</div>}

      {canReview && (
        <div className="cup-review-actions">
          <button className="cup-btn secondary" onClick={reset}>Cancel</button>
          <button className="cup-btn primary" onClick={handlePublish}>
            Apply & Deploy
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function CricosUpdatePanel() {
  const [activeTab, setActiveTab] = useState('cricos');
  const [githubToken, setGithubToken] = useState(() =>
    import.meta.env.VITE_GITHUB_TOKEN || localStorage.getItem(STORAGE_KEY) || ''
  );

  const handleTokenSaved = (token) => setGithubToken(token);

  const handleForgetToken = () => {
    localStorage.removeItem(STORAGE_KEY);
    setGithubToken(import.meta.env.VITE_GITHUB_TOKEN || '');
  };

  if (!githubToken) return <TokenSetup onSaved={handleTokenSaved} />;

  return (
    <div className="cup-root">
      <div className="cup-token-bar">
        <span className="cup-token-connected">GitHub connected</span>
        <button className="cup-btn-xs danger" onClick={handleForgetToken}>Disconnect</button>
      </div>

      <div className="cup-inner-tabs">
        <button
          className={`cup-inner-tab ${activeTab === 'cricos' ? 'active' : ''}`}
          onClick={() => setActiveTab('cricos')}
        >
          CRICOS Data
        </button>
        <button
          className={`cup-inner-tab ${activeTab === 'levels' ? 'active' : ''}`}
          onClick={() => setActiveTab('levels')}
        >
          Assessment Levels
        </button>
      </div>

      {activeTab === 'cricos' && <CricosDataUpdate githubToken={githubToken} />}
      {activeTab === 'levels' && <AssessmentLevelsUpdate githubToken={githubToken} />}
    </div>
  );
}
