/**
 * Update Detection Service
 * Pilates Espaço Mulher — Dra. Rogéria Collares (CREFITO 23093-F)
 * 
 * Implements dual non-blocking update detection at app startup:
 * 1. Primary: expo-updates via Updates.checkForUpdateAsync()
 * 2. Fallback: GitHub Releases public API (GET https://api.github.com/repos/{owner}/{repo}/releases/latest)
 *    comparing tag_name against Constants.expoConfig.version
 * 
 * Strictly handles graceful degradation:
 * - Offline device, network failures, timeouts, rate limits, or disabled updates
 *   never crash the app or throw unhandled exceptions.
 */

import * as Updates from 'expo-updates';
import Constants from 'expo-constants';

export type UpdateSource = 'expo-updates' | 'github-release' | 'none';

export interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
  content_type: string;
}

export interface GitHubReleaseResponse {
  tag_name: string;
  name?: string;
  body?: string;
  html_url: string;
  published_at?: string;
  assets?: GitHubReleaseAsset[];
}

export interface UpdateCheckResult {
  isAvailable: boolean;
  source: UpdateSource;
  currentVersion: string;
  latestVersion?: string;
  releaseNotes?: string | null;
  downloadUrl?: string | null;
  publishedAt?: string | null;
  error?: string | null;
}

export interface UpdateCheckOptions {
  githubOwner?: string;
  githubRepo?: string;
  timeoutMs?: number;
  silent?: boolean;
}

const DEFAULT_GITHUB_OWNER = 'pilates-espaco-mulher';
const DEFAULT_GITHUB_REPO = 'pilates-espaco-mulher';
const DEFAULT_TIMEOUT_MS = 6000;

/**
 * Normalizes version strings by removing leading 'v' or 'V' and trimming whitespace.
 */
export function normalizeVersion(versionStr?: string | null): string {
  if (!versionStr) return '0.0.0';
  return versionStr.trim().replace(/^[vV]/, '');
}

/**
 * Compares two semantic version strings.
 * Returns:
 *   1 if v1 > v2 (v1 is newer)
 *  -1 if v1 < v2 (v2 is newer)
 *   0 if v1 === v2 (equal)
 */
export function compareSemVer(v1: string, v2: string): number {
  const norm1 = normalizeVersion(v1);
  const norm2 = normalizeVersion(v2);

  const parts1 = norm1.split('.').map((p) => {
    const parsed = parseInt(p.split('-')[0], 10);
    return isNaN(parsed) ? 0 : parsed;
  });
  const parts2 = norm2.split('.').map((p) => {
    const parsed = parseInt(p.split('-')[0], 10);
    return isNaN(parsed) ? 0 : parsed;
  });

  const length = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < length; i++) {
    const num1 = parts1[i] ?? 0;
    const num2 = parts2[i] ?? 0;

    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  return 0;
}

/**
 * Retrieves the currently running application version from Expo Constants.
 */
export function getCurrentAppVersion(): string {
  return Constants.expoConfig?.version ?? '1.0.0';
}

/**
 * Checks for updates via expo-updates (OTA).
 * Returns isAvailable true if an OTA update is published on EAS.
 * Gracefully returns null or isAvailable false if disabled or errored.
 */
export async function checkExpoUpdatesAsync(): Promise<{ isAvailable: boolean; manifest?: unknown } | null> {
  try {
    // If running in development client or updates are disabled, gracefully skip
    if (!Updates.isEnabled) {
      return { isAvailable: false };
    }

    const update = await Updates.checkForUpdateAsync();
    return {
      isAvailable: update.isAvailable,
      manifest: update.manifest,
    };
  } catch {
    // Graceful degradation: catch and silence OTA check errors (e.g. offline)
    return null;
  }
}

/**
 * Checks for updates via public GitHub Releases API as a reliable fallback.
 */
export async function checkGitHubReleaseAsync(
  owner: string = DEFAULT_GITHUB_OWNER,
  repo: string = DEFAULT_GITHUB_REPO,
  currentVersion: string = getCurrentAppVersion(),
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<{
  isAvailable: boolean;
  latestVersion: string;
  releaseNotes?: string | null;
  downloadUrl?: string;
  publishedAt?: string | null;
} | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases/latest`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'PilatesEspacoMulherApp',
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as GitHubReleaseResponse;
    if (!data || !data.tag_name) {
      return null;
    }

    const latestVersion = normalizeVersion(data.tag_name);
    const isNewer = compareSemVer(latestVersion, currentVersion) > 0;

    // Search for apk asset or fallback to release html url
    let downloadUrl = data.html_url;
    if (Array.isArray(data.assets) && data.assets.length > 0) {
      const apkAsset = data.assets.find((a) => a.name.endsWith('.apk') || a.browser_download_url.endsWith('.apk'));
      if (apkAsset?.browser_download_url) {
        downloadUrl = apkAsset.browser_download_url;
      }
    }

    return {
      isAvailable: isNewer,
      latestVersion,
      releaseNotes: data.body ?? null,
      downloadUrl,
      publishedAt: data.published_at ?? null,
    };
  } catch {
    // Graceful degradation: catch network failures, offline status, timeouts
    clearTimeout(timer);
    return null;
  }
}

/**
 * Executes dual update detection:
 * 1. Checks expo-updates OTA
 * 2. If no OTA update, falls back to GitHub Releases API
 * Returns structured UpdateCheckResult without throwing.
 */
export async function checkForUpdates(options: UpdateCheckOptions = {}): Promise<UpdateCheckResult> {
  const currentVersion = getCurrentAppVersion();
  const owner = options.githubOwner || DEFAULT_GITHUB_OWNER;
  const repo = options.githubRepo || DEFAULT_GITHUB_REPO;
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

  try {
    // 1. Primary check: expo-updates
    const expoResult = await checkExpoUpdatesAsync();
    if (expoResult && expoResult.isAvailable) {
      return {
        isAvailable: true,
        source: 'expo-updates',
        currentVersion,
      };
    }

    // 2. Fallback check: GitHub Releases API
    const githubResult = await checkGitHubReleaseAsync(owner, repo, currentVersion, timeoutMs);
    if (githubResult && githubResult.isAvailable) {
      return {
        isAvailable: true,
        source: 'github-release',
        currentVersion,
        latestVersion: githubResult.latestVersion,
        releaseNotes: githubResult.releaseNotes,
        downloadUrl: githubResult.downloadUrl,
        publishedAt: githubResult.publishedAt,
      };
    }

    // No updates found on either channel
    return {
      isAvailable: false,
      source: 'none',
      currentVersion,
    };
  } catch (error) {
    // Graceful degradation: never crash
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      isAvailable: false,
      source: 'none',
      currentVersion,
      error: errorMsg,
    };
  }
}

/**
 * Non-blocking update check meant to be called on app startup.
 * Runs completely in the background without blocking the UI or splash screen.
 */
export function checkForUpdatesInBackground(
  callback?: (result: UpdateCheckResult) => void,
  options?: UpdateCheckOptions
): void {
  // Floating promise wrapped in catch-all
  checkForUpdates(options)
    .then((result) => {
      if (callback) {
        callback(result);
      }
    })
    .catch(() => {
      // Intentionally silenced for non-blocking startup resilience
    });
}

/**
 * Downloads and applies an available OTA update using expo-updates.
 * Returns true if update was fetched and reloaded, false otherwise.
 */
export async function fetchAndApplyExpoUpdate(): Promise<boolean> {
  try {
    if (!Updates.isEnabled) return false;
    const fetchResult = await Updates.fetchUpdateAsync();
    if (fetchResult.isNew) {
      await Updates.reloadAsync();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
