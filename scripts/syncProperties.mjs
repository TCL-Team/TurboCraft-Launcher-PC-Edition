import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

/**
 * Parses Java/Gradle `.properties` format (`key=value` or `key: value`, `#` / `!` comments)
 */
export function parseGradleProperties(filePath) {
  const props = {};
  if (!fs.existsSync(filePath)) return props;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) continue;
    const match = trimmed.match(/^([^=:]+?)\s*[=:]\s*(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    const val = match[2].trim();
    props[key] = val;
  }
  return props;
}

/**
 * Exact equivalent of `getKeyFromLocal(envKey, fileName, default)` in `TCL/build.gradle.kts`
 */
function getKeyFromLocal(envKey, fileName, propValue = '') {
  if (process.env[envKey] && process.env[envKey].trim()) {
    return process.env[envKey].trim();
  }
  if (fileName) {
    const p = path.join(rootDir, fileName);
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, 'utf8').trim();
      if (content) return content;
    }
  }
  return propValue || '';
}

function toSemver(versionStr) {
  const clean = String(versionStr || '1.0.0').trim().replace(/^v/i, '');
  const parts = clean.split('-')[0].split('.');
  while (parts.length < 3) parts.push('0');
  const suffix = clean.includes('-') ? `-${clean.split('-').slice(1).join('-')}` : '';
  return `${parts.slice(0, 3).map((n) => Number.parseInt(n, 10) || 0).join('.')}${suffix}`;
}

export function syncAllFromGradleProperties(silent = false) {
  const propsPath = path.join(rootDir, 'gradle.properties');
  const props = parseGradleProperties(propsPath);

  const launcherName = props.launcher_name || 'TurboCraft Launcher';
  const launcherAppName = props.launcher_app_name || `${launcherName} — PC Edition`;
  const launcherShortName = props.launcher_short_name || 'TCL';
  const launcherAppId = props.launcher_app_id || 'com.tcl.mc.pc';
  const launcherCopyright =
    props.launcher_copyright || `Copyright (C) 2026 ${launcherShortName} Team (GPL-3.0)`;

  const launcherVersionCode = Number.parseInt(props.launcher_version_code || '9', 10) || 9;
  const launcherVersionName = props.launcher_version_name || '1.6.0';
  const npmSemver = toSemver(launcherVersionName);

  const urlHome = props.url_home || 'https://github.com/TCL-Team/TurboCraft-Launcher-PC-Edition';
  const urlMobileRepo = props.url_mobile_repo || 'https://github.com/TCL-Team/TurboCraft-Launcher';
  const urlDiscord = props.url_discord || 'https://discord.gg/bwkpJZB6NS';
  const urlYoutube = props.url_youtube || 'https://youtube.com/@TurboCraft_Launcher';
  const urlGithubOrg = props.url_github_org || 'https://github.com/TCL-Team';

  const oauthClientId = getKeyFromLocal(
    'OAUTH_CLIENT_ID',
    '.oauth_client_id.txt',
    props.oauth_client_id || '00000000402b5328'
  );
  const curseforgeApiKey = getKeyFromLocal(
    'CURSEFORGE_API_KEY',
    '.curseforge_api.txt',
    props.curseforge_api_key || ''
  );
  const discordAppId = getKeyFromLocal(
    'DISCORD_APP_ID',
    '.discord_app_id.txt',
    props.discord_app_id || ''
  );

  const socialSupabaseUrl =
    props.social_supabase_url || 'https://qvjanukzamquosjxhxnc.supabase.co';
  const socialSupabasePublishableKey =
    props.social_supabase_publishable_key ||
    'sb_publishable_ErkdgkvWDiVqY6_xE0mZAw_yj-nptNo';

  const defaultTheme = props.default_theme || 'VERDANT_DAWN';
  const defaultCustomHex = props.default_custom_hex || '#8BE51B';
  const defaultFestivalEffect = props.default_festival_effect || 'fireflies';
  const defaultRamMb = Number.parseInt(props.default_ram_mb || '4096', 10) || 4096;

  // 1. Generate `src/generated/buildConfig.ts` (BuildKeys — mirrors Kotlin BuildKeys.*)
  const generatedDir = path.join(rootDir, 'src', 'generated');
  fs.mkdirSync(generatedDir, { recursive: true });
  const buildConfigTs = `/* AUTO-GENERATED FROM gradle.properties BY scripts/syncProperties.mjs — DO NOT EDIT DIRECTLY */

export const BuildKeys = {
  LAUNCHER_NAME: ${JSON.stringify(launcherName)},
  LAUNCHER_APP_NAME: ${JSON.stringify(launcherAppName)},
  LAUNCHER_SHORT_NAME: ${JSON.stringify(launcherShortName)},
  LAUNCHER_APP_ID: ${JSON.stringify(launcherAppId)},
  LAUNCHER_COPYRIGHT: ${JSON.stringify(launcherCopyright)},
  LAUNCHER_VERSION_CODE: ${launcherVersionCode},
  LAUNCHER_VERSION_NAME: ${JSON.stringify(launcherVersionName)},
  URL_HOME: ${JSON.stringify(urlHome)},
  URL_MOBILE_REPO: ${JSON.stringify(urlMobileRepo)},
  URL_DISCORD: ${JSON.stringify(urlDiscord)},
  URL_YOUTUBE: ${JSON.stringify(urlYoutube)},
  URL_GITHUB_ORG: ${JSON.stringify(urlGithubOrg)},
  OAUTH_CLIENT_ID: ${JSON.stringify(oauthClientId)},
  CURSEFORGE_API_KEY: ${JSON.stringify(curseforgeApiKey)},
  DISCORD_APP_ID: ${JSON.stringify(discordAppId)},
  SOCIAL_SUPABASE_URL: ${JSON.stringify(socialSupabaseUrl)},
  SOCIAL_SUPABASE_PUBLISHABLE_KEY: ${JSON.stringify(socialSupabasePublishableKey)},
  DEFAULT_THEME: ${JSON.stringify(defaultTheme)},
  DEFAULT_CUSTOM_HEX: ${JSON.stringify(defaultCustomHex)},
  DEFAULT_FESTIVAL_EFFECT: ${JSON.stringify(defaultFestivalEffect)},
  DEFAULT_RAM_MB: ${defaultRamMb},
} as const;
`;
  const buildConfigPath = path.join(generatedDir, 'buildConfig.ts');
  if (!fs.existsSync(buildConfigPath) || fs.readFileSync(buildConfigPath, 'utf8') !== buildConfigTs) {
    fs.writeFileSync(buildConfigPath, buildConfigTs, 'utf8');
  }

  // 2. Sync `package.json` version & description
  const pkgPath = path.join(rootDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    let pkgChanged = false;
    if (pkg.version !== npmSemver) {
      pkg.version = npmSemver;
      pkgChanged = true;
    }
    const nextDesc = `${launcherAppName} — Desktop Minecraft: Java Edition Launcher`;
    if (pkg.description !== nextDesc) {
      pkg.description = nextDesc;
      pkgChanged = true;
    }
    if (pkgChanged) {
      fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
    }
  }

  // 3. Sync `electron-builder.json` productName, appId, copyright & installer artifact names
  const ebPath = path.join(rootDir, 'electron-builder.json');
  if (fs.existsSync(ebPath)) {
    const eb = JSON.parse(fs.readFileSync(ebPath, 'utf8'));
    const safeSlug = launcherName.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '') || 'TurboCraft';
    const asciiProductName = launcherAppName.replace(/[—–]/g, '-').replace(/\s+/g, ' ').trim();
    eb.appId = launcherAppId;
    eb.productName = asciiProductName;
    eb.copyright = launcherCopyright;
    if (eb.nsis) {
      eb.nsis.shortcutName = launcherName;
      eb.nsis.artifactName = `${safeSlug}-PC-\${version}-Setup-\${arch}.\${ext}`;
    }
    if (eb.portable) {
      eb.portable.artifactName = `${safeSlug}-PC-\${version}-Portable-\${arch}.\${ext}`;
    }
    if (eb.linux) {
      eb.linux.artifactName = `${safeSlug}-PC-\${version}-Linux-\${arch}.\${ext}`;
    }
    if (eb.mac) {
      eb.mac.artifactName = `${safeSlug}-PC-\${version}-macOS-\${arch}.\${ext}`;
    }
    const ebFormatted = `${JSON.stringify(eb, null, 2)}\n`;
    if (fs.readFileSync(ebPath, 'utf8') !== ebFormatted) {
      fs.writeFileSync(ebPath, ebFormatted, 'utf8');
    }
  }

  // 4. Sync `index.html` <title>
  const htmlPath = path.join(rootDir, 'index.html');
  if (fs.existsSync(htmlPath)) {
    const rawHtml = fs.readFileSync(htmlPath, 'utf8');
    const updatedHtml = rawHtml.replace(
      /<title>.*?<\/title>/i,
      `<title>${launcherAppName}</title>`
    );
    if (rawHtml !== updatedHtml) {
      fs.writeFileSync(htmlPath, updatedHtml, 'utf8');
    }
  }

  if (!silent) {
    console.log(
      `[gradle.properties] Synced BuildKeys -> ${launcherAppName} v${launcherVersionName} (code ${launcherVersionCode})`
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  syncAllFromGradleProperties(false);
}
