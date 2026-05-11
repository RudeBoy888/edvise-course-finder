const OWNER = 'RudeBoy888';
const REPO = 'edvise-course-finder';
const API = 'https://api.github.com';

function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function apiRequest(token, method, path, body = null) {
  const res = await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${path}`, {
    method,
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `GitHub API error ${res.status}`);
  return data;
}

async function getFileSha(token, path) {
  // For large files GitHub doesn't return content inline but always returns sha
  const data = await apiRequest(token, 'GET', path);
  return data.sha;
}

export async function commitFile(token, filePath, content, commitMessage) {
  const sha = await getFileSha(token, filePath);
  const base64Content = toBase64(content);
  await apiRequest(token, 'PUT', filePath, {
    message: commitMessage,
    content: base64Content,
    sha,
  });
}

export async function validateToken(token) {
  const res = await fetch(`${API}/user`, {
    headers: { Authorization: `token ${token}` },
  });
  if (!res.ok) throw new Error('Invalid token or no access');
  return await res.json();
}

export async function appendHistory(token, entry) {
  const path = 'public/update_history.json';
  let currentHistory = [];
  let sha = null;

  try {
    const data = await apiRequest(token, 'GET', path);
    sha = data.sha;
    // History file is small — GitHub returns content inline
    const decoded = atob(data.content.replace(/\n/g, ''));
    currentHistory = JSON.parse(new TextDecoder().decode(
      Uint8Array.from(decoded, c => c.charCodeAt(0))
    ));
  } catch {
    // File doesn't exist yet — start fresh
  }

  const updated = [{ ...entry, id: new Date().toISOString() }, ...currentHistory].slice(0, 100);
  const content = toBase64(JSON.stringify(updated, null, 2));

  await apiRequest(token, 'PUT', path, {
    message: `Update history: ${entry.type} update ${entry.date}`,
    content,
    ...(sha ? { sha } : {}),
  });
}
