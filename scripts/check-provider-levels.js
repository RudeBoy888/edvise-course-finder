#!/usr/bin/env node
/**
 * check-provider-levels.js
 *
 * Determines Assessment Level (1-3) for each CRICOS provider AND each country
 * by calling the Australian Government Document Checklist Tool API directly.
 *
 * API: POST https://immi.homeaffairs.gov.au/_layouts/15/api/ESB.aspx/GetStudentDocumentChecklistType
 * Body: { countryPassport, provider, cricosCode, studentEvidenceStudyTypeCode: "01" }
 * Returns: { d: { data: [{ studentResult: "Streamlined" | "Regular" }] } }
 *
 * Classification logic:
 *   Iraq (L3) + school → "Streamlined" → school = Level 1
 *   Iraq (L3) + school → "Regular" → test with Argentina (L2):
 *     Argentina + school → "Streamlined" → school = Level 2
 *     Argentina + school → "Regular"     → school = Level 3
 *
 * Country level detection (using known L2 and L3 schools):
 *   country + L2 school → "Regular"     → country = Level 3
 *   country + L2 school → "Streamlined"
 *     country + L3 school → "Regular"   → country = Level 2
 *     country + L3 school → "Streamlined" → country = Level 1
 *
 * Output files:
 *   public/provider_levels.json   — school levels (1-3)
 *   public/country_levels.json    — country levels (1-3)
 *
 * Usage:
 *   node scripts/check-provider-levels.js              # Full run
 *   node scripts/check-provider-levels.js --limit 20  # Test first 20 providers
 *   node scripts/check-provider-levels.js --countries  # Also build country levels
 *   node scripts/check-provider-levels.js --reset      # Clear saved and restart
 */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const COURSES_DATA_PATH = join(__dirname, '../public/courses_data.json');
const PROVIDER_OUTPUT_PATH = join(__dirname, '../public/provider_levels.json');
const COUNTRY_OUTPUT_PATH = join(__dirname, '../public/country_levels.json');
const TOOL_URL = 'https://immi.homeaffairs.gov.au/visas/web-evidentiary-tool';
const API_URL = 'https://immi.homeaffairs.gov.au/_layouts/15/api/ESB.aspx/GetStudentDocumentChecklistType';

// Known anchor providers for level determination
const ANCHOR_PROVIDERS = {
  LEVEL2: '02672K',  // Greenwich English College (confirmed Level 2)
  LEVEL3: '03717E',  // UNSW Global (confirmed Level 3, see below)
};

// Known anchor countries for provider level determination
const ANCHOR_COUNTRIES = {
  LEVEL3: 'IRQ',  // Iraq
  LEVEL2: 'ARG',  // Argentina
};

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function randomDelay(min = 300, max = 800) {
  return sleep(Math.floor(Math.random() * (max - min + 1)) + min);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const idx = (flag) => args.indexOf(flag);
  return {
    limit:      idx('--limit')     >= 0 ? parseInt(args[idx('--limit') + 1])     : null,
    reset:      args.includes('--reset'),
    countries:  args.includes('--countries'),
    skipSchools: args.includes('--skip-schools'),
  };
}

function loadProviders() {
  const raw = JSON.parse(readFileSync(COURSES_DATA_PATH, 'utf8'));
  const seen = new Set();
  const providers = [];
  for (const inst of raw) {
    if (inst.providerCode && !seen.has(inst.providerCode)) {
      seen.add(inst.providerCode);
      providers.push({ code: inst.providerCode, name: inst.name });
    }
  }
  return providers;
}

function loadExistingResults(path) {
  if (existsSync(path)) {
    try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return {}; }
  }
  return {};
}

function saveResults(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2));
}

// ---------------------------------------------------------------------------
// Core API call — uses page.evaluate to leverage browser session/cookies
// ---------------------------------------------------------------------------
async function callChecklist(page, countryCode, cricosCode) {
  try {
    const result = await page.evaluate(async ({ country, cricos, url }) => {
      const digest = document.getElementById('__REQUESTDIGEST')?.value || '';
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-RequestDigest': digest,
        },
        body: JSON.stringify({
          countryPassport: country,
          provider: cricos,
          cricosCode: cricos,
          studentEvidenceStudyTypeCode: '01',
        }),
        credentials: 'include',
      });
      if (!resp.ok) return { error: `HTTP ${resp.status}` };
      return resp.json();
    }, { country: countryCode, cricos: cricosCode, url: API_URL });

    if (result?.error) return { streamlined: false, error: result.error };
    const studentResult = result?.d?.data?.[0]?.studentResult;
    if (!studentResult) return { streamlined: false, error: 'No studentResult in response' };

    return { streamlined: studentResult === 'Streamlined', raw: studentResult, error: null };
  } catch (err) {
    return { streamlined: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Classify school level (1, 2, or 3)
// ---------------------------------------------------------------------------
async function classifySchool(page, providerCode) {
  // Test 1: Iraq (Level 3 country)
  const iraqResult = await callChecklist(page, ANCHOR_COUNTRIES.LEVEL3, providerCode);
  await randomDelay();

  if (iraqResult.error) return { level: null, error: iraqResult.error, tests: { iraq: null, argentina: null } };

  if (iraqResult.streamlined) {
    // Iraq + school = Streamlined → school is Level 1
    return { level: 1, tests: { iraq: 'Streamlined', argentina: null } };
  }

  // Iraq = Regular → test Argentina (Level 2 country)
  const argResult = await callChecklist(page, ANCHOR_COUNTRIES.LEVEL2, providerCode);
  await randomDelay();

  if (argResult.error) return { level: null, error: `Argentina test failed: ${argResult.error}`, tests: { iraq: 'Regular', argentina: null } };

  if (argResult.streamlined) {
    return { level: 2, tests: { iraq: 'Regular', argentina: 'Streamlined' } };
  } else {
    return { level: 3, tests: { iraq: 'Regular', argentina: 'Regular' } };
  }
}

// ---------------------------------------------------------------------------
// Classify country level (1, 2, or 3)
// Requires at least one known Level 2 and Level 3 school
// ---------------------------------------------------------------------------
async function classifyCountry(page, countryCode, knownL2School, knownL3School) {
  // Test with Level 2 school
  const l2Result = await callChecklist(page, countryCode, knownL2School);
  await randomDelay();

  if (l2Result.error) return { level: null, error: l2Result.error };

  if (!l2Result.streamlined) {
    // Country + L2 school = Regular → country is Level 3
    return { level: 3, tests: { l2school: 'Regular', l3school: null } };
  }

  // Country + L2 school = Streamlined → country is L1 or L2
  // Test with Level 3 school
  const l3Result = await callChecklist(page, countryCode, knownL3School);
  await randomDelay();

  if (l3Result.error) return { level: null, error: l3Result.error };

  if (!l3Result.streamlined) {
    // Country + L3 school = Regular → country is Level 2
    return { level: 2, tests: { l2school: 'Streamlined', l3school: 'Regular' } };
  } else {
    // Country + L3 school = Streamlined → country is Level 1
    return { level: 1, tests: { l2school: 'Streamlined', l3school: 'Streamlined' } };
  }
}

// ---------------------------------------------------------------------------
// Initialize browser with session
// ---------------------------------------------------------------------------
async function initBrowser() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
  });
  const page = await ctx.newPage();
  await page.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });

  await page.goto(TOOL_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);

  return { browser, page };
}

// ---------------------------------------------------------------------------
// Refresh session if needed (every ~200 calls)
// ---------------------------------------------------------------------------
async function refreshSessionIfNeeded(page, callCount) {
  if (callCount % 200 === 0 && callCount > 0) {
    console.log('\n  [Refreshing session...]');
    await page.goto(TOOL_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(2000);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = parseArgs();
  const providers = loadProviders();
  const providerResults = args.reset ? {} : loadExistingResults(PROVIDER_OUTPUT_PATH);
  const countryResults = args.reset ? {} : loadExistingResults(COUNTRY_OUTPUT_PATH);

  console.log(`\n=== CRICOS Assessment Level Checker ===`);
  console.log(`Providers in database: ${providers.length}`);
  console.log(`Providers already checked: ${Object.keys(providerResults).length}`);
  if (args.limit) console.log(`Limit: ${args.limit}`);
  console.log('');

  const { browser, page } = await initBrowser();

  let callCount = 0;

  // --- Phase 1: Determine school levels ---
  if (!args.skipSchools) {
    // First, confirm Level 3 anchor school (UNSW Global)
    // If not yet confirmed, test it now
    let l3AnchorSchool = ANCHOR_PROVIDERS.LEVEL3;
    if (!providerResults[l3AnchorSchool]) {
      console.log('Confirming Level 3 anchor school (UNSW Global)...');
      const anchorResult = await classifySchool(page, l3AnchorSchool);
      callCount += 2;
      if (anchorResult.level === 3) {
        console.log('  UNSW Global confirmed as Level 3 ✓');
        providerResults[l3AnchorSchool] = { providerName: 'UNSW Global', level: 3, testedAt: new Date().toISOString().split('T')[0], ...anchorResult };
        saveResults(PROVIDER_OUTPUT_PATH, providerResults);
      } else {
        console.log(`  WARNING: UNSW Global returned level ${anchorResult.level}, expected 3. Using anyway.`);
        providerResults[l3AnchorSchool] = { providerName: 'UNSW Global', ...anchorResult, testedAt: new Date().toISOString().split('T')[0] };
      }
    }

    const toCheck = providers.filter(p => !providerResults[p.code]);
    const target = args.limit ? toCheck.slice(0, args.limit) : toCheck;

    console.log(`\nSchools to check: ${target.length}`);
    console.log('Starting school level detection...\n');

    let schoolsChecked = 0;
    for (const provider of target) {
      schoolsChecked++;
      const progress = `[${schoolsChecked}/${target.length}]`;
      process.stdout.write(`${progress} ${provider.code} ${provider.name.substring(0, 35).padEnd(35)} `);

      await refreshSessionIfNeeded(page, callCount);

      const result = await classifySchool(page, provider.code);
      callCount += result.tests?.iraq && result.tests?.argentina ? 2 : 1;

      if (result.error) {
        console.log(`ERROR: ${result.error}`);
      } else {
        const levelLabel = { 1: 'Level 1 ✓', 2: 'Level 2', 3: 'Level 3' }[result.level] || '?';
        console.log(`${levelLabel} (Iraq:${result.tests.iraq} Arg:${result.tests.argentina || '-'})`);
      }

      providerResults[provider.code] = {
        providerName: provider.name,
        level: result.level,
        testedAt: new Date().toISOString().split('T')[0],
        tests: result.tests,
        ...(result.error ? { error: result.error } : {}),
      };

      saveResults(PROVIDER_OUTPUT_PATH, providerResults);
    }
  }

  // --- Phase 2: Determine country levels (optional, run with --countries) ---
  if (args.countries) {
    // Find confirmed L2 and L3 schools from results
    // Always use known anchor schools for country classification — ensures consistency
    const confirmedL2 = ANCHOR_PROVIDERS.LEVEL2; // Greenwich English College (confirmed L2)
    const confirmedL3 = ANCHOR_PROVIDERS.LEVEL3; // UNSW Global (confirmed L3)

    console.log(`\nCountry level detection using:`);
    console.log(`  Level 2 school: ${confirmedL2} (${providerResults[confirmedL2]?.providerName || '?'})`);
    console.log(`  Level 3 school: ${confirmedL3} (${providerResults[confirmedL3]?.providerName || '?'})\n`);

    // Get country list from the page
    const countries = await page.evaluate(() => {
      const sel = document.getElementById('drpWebEvtCountryPassport');
      return Array.from(sel.options)
        .filter(o => o.value && o.value !== ' ' && o.value !== 'XXX')
        .map(o => ({ code: o.value, name: o.text }));
    });

    const countriesToCheck = countries.filter(c => !countryResults[c.code]);
    console.log(`Countries to check: ${countriesToCheck.length}`);

    let countriesChecked = 0;
    for (const country of countriesToCheck) {
      countriesChecked++;
      const progress = `[${countriesChecked}/${countriesToCheck.length}]`;
      process.stdout.write(`${progress} ${country.code} ${country.name.substring(0, 30).padEnd(30)} `);

      await refreshSessionIfNeeded(page, callCount);

      const result = await classifyCountry(page, country.code, confirmedL2, confirmedL3);
      callCount += 2;

      if (result.error) {
        console.log(`ERROR: ${result.error}`);
      } else {
        const levelLabel = { 1: 'Level 1', 2: 'Level 2', 3: 'Level 3' }[result.level];
        console.log(levelLabel);
      }

      countryResults[country.code] = {
        countryName: country.name,
        level: result.level,
        testedAt: new Date().toISOString().split('T')[0],
        tests: result.tests,
        ...(result.error ? { error: result.error } : {}),
      };

      saveResults(COUNTRY_OUTPUT_PATH, countryResults);
    }
  }

  await browser.close();

  // Final summary
  const schoolLevelCounts = { 1: 0, 2: 0, 3: 0, null: 0 };
  for (const r of Object.values(providerResults)) {
    const k = r.level ?? 'null';
    schoolLevelCounts[k] = (schoolLevelCounts[k] || 0) + 1;
  }

  console.log('\n=== Summary ===');
  console.log(`Total schools checked: ${Object.keys(providerResults).length}`);
  console.log(`  Level 1: ${schoolLevelCounts[1]}`);
  console.log(`  Level 2: ${schoolLevelCounts[2]}`);
  console.log(`  Level 3: ${schoolLevelCounts[3]}`);
  console.log(`  Unknown/Error: ${schoolLevelCounts.null}`);

  if (args.countries) {
    const countryLevelCounts = { 1: 0, 2: 0, 3: 0, null: 0 };
    for (const r of Object.values(countryResults)) {
      const k = r.level ?? 'null';
      countryLevelCounts[k] = (countryLevelCounts[k] || 0) + 1;
    }
    console.log(`Total countries checked: ${Object.keys(countryResults).length}`);
    console.log(`  Level 1: ${countryLevelCounts[1]}`);
    console.log(`  Level 2: ${countryLevelCounts[2]}`);
    console.log(`  Level 3: ${countryLevelCounts[3]}`);
  }

  console.log(`\nSaved to: ${PROVIDER_OUTPUT_PATH}`);
  if (args.countries) console.log(`Countries saved to: ${COUNTRY_OUTPUT_PATH}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
