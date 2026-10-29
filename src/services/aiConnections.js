import { normalizeBaseUrl, normalizeProviderId } from './aiProvider.js';

const PROFILES_KEY = 'bmpos-ai-connections-v1';

export function connectionIdentity(settings = {}) {
  const provider = normalizeProviderId(settings.provider);
  return JSON.stringify([provider, provider === 'gemini' ? '' : normalizeBaseUrl(settings.baseUrl)]);
}

export function getAiConnections() {
  try {
    const records = JSON.parse(localStorage.getItem(PROFILES_KEY) || '[]');
    return Array.isArray(records) ? records.filter(item => item && typeof item.id === 'string') : [];
  } catch { return []; }
}

export function saveAiConnection(settings, name, id = '') {
  const label = String(name || '').trim().slice(0, 80);
  if (!label) throw new Error('Isi nama provider terlebih dahulu.');
  const profile = {
    id: id || crypto.randomUUID(), name: label,
    provider: normalizeProviderId(settings.provider),
    baseUrl: String(settings.baseUrl || '').trim(), model: String(settings.model || '').trim(),
    apiKey: String(settings.apiKey || '').trim(), sendImageToAi: settings.sendImageToAi !== false
  };
  const profiles = getAiConnections();
  localStorage.setItem(PROFILES_KEY, JSON.stringify([...profiles.filter(item => item.id !== profile.id), profile]));
  return profile;
}

export function deleteAiConnection(id) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(getAiConnections().filter(item => item.id !== id)));
}

// Never send a credential from a different provider or host after cloud sync or UI changes.
export function resolveConnectionKey(current, next) {
  if (connectionIdentity(current) === connectionIdentity(next)) return String(current.apiKey || '');
  return getAiConnections().find(item => connectionIdentity(item) === connectionIdentity(next))?.apiKey || '';
}
