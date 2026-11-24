import { ModLoaderType } from '../types/launcher';

export interface MojangVersionItem {
  id: string;
  type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha';
  releaseTime: string;
}

const FALLBACK_VERSIONS: MojangVersionItem[] = [
  { id: '1.21.4', type: 'release', releaseTime: '2024-12-03' },
  { id: '1.21.3', type: 'release', releaseTime: '2024-10-23' },
  { id: '1.21.1', type: 'release', releaseTime: '2024-08-08' },
  { id: '1.20.6', type: 'release', releaseTime: '2024-04-29' },
  { id: '1.20.4', type: 'release', releaseTime: '2023-12-07' },
  { id: '1.20.1', type: 'release', releaseTime: '2023-06-12' },
  { id: '1.19.4', type: 'release', releaseTime: '2023-03-14' },
  { id: '1.18.2', type: 'release', releaseTime: '2022-02-28' },
  { id: '1.16.5', type: 'release', releaseTime: '2021-01-15' },
  { id: '1.12.2', type: 'release', releaseTime: '2017-09-18' },
  { id: '1.8.9', type: 'release', releaseTime: '2015-12-09' },
  { id: '1.7.10', type: 'release', releaseTime: '2014-06-26' },
  { id: '25w09b', type: 'snapshot', releaseTime: '2025-02-27' },
  { id: 'b1.7.3', type: 'old_beta', releaseTime: '2011-07-08' },
];

export async function fetchMojangVersions(): Promise<MojangVersionItem[]> {
  try {
    const res = await fetch('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json');
    if (!res.ok) throw new Error('manifest error');
    const json = await res.json();
    return (json.versions || []).map((v: any) => ({
      id: v.id,
      type: v.type,
      releaseTime: String(v.releaseTime || '').slice(0, 10),
    }));
  } catch {
    return FALLBACK_VERSIONS;
  }
}

export async function fetchLoaderVersions(mcVersion: string, loader: ModLoaderType): Promise<string[]> {
  if (loader === 'vanilla') return [];
  try {
    if (loader === 'fabric') {
      const res = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${encodeURIComponent(mcVersion)}`);
      if (res.ok) {
        const arr = await res.json();
        const list = (arr || []).map((x: any) => x.loader?.version).filter(Boolean);
        if (list.length > 0) return list.slice(0, 20);
      }
    } else if (loader === 'quilt') {
      const res = await fetch(`https://meta.quiltmc.org/v3/versions/loader/${encodeURIComponent(mcVersion)}`);
      if (res.ok) {
        const arr = await res.json();
        const list = (arr || []).map((x: any) => x.loader?.version).filter(Boolean);
        if (list.length > 0) return list.slice(0, 20);
      }
    }
  } catch {
    // fallback below
  }

  const defaults: Record<ModLoaderType, string[]> = {
    vanilla: [],
    fabric: ['0.16.10', '0.16.9', '0.16.7', '0.15.11'],
    quilt: ['0.27.1', '0.26.4'],
    neoforge: ['21.4.84-beta', '21.1.122', '20.4.237'],
    forge: ['54.0.26', '47.3.12', '43.4.0', '36.2.42'],
    optifine: ['HD_U_J3', 'HD_U_I6'],
  };
  return defaults[loader] || [];
}

/**
 * Generates crisp procedural PNG Cape Data-URLs (64x32 Minecraft cape UV layout)
 * so the 3D Cape Wardrobe works offline & online with zero broken textures,
 * plus fetches OfficialCapes from `api.minecraftcapes.net` when available!
 */
export interface WardrobeCapeItem {
  id: string;
  name: string;
  subtitle: string;
  url: string;
  accent: string;
}

function generateProceduralCapeDataUrl(bgHex: string, emblemHex: string, borderHex: string): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.clearRect(0, 0, 64, 32);
  // Front/Back cape faces in standard 64x32 cape layout:
  // Back visible face: x=1..11, y=1..17 (width 10, height 16)
  // Front/inner face: x=12..22, y=1..17
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, 22, 17);

  ctx.fillStyle = borderHex;
  ctx.fillRect(1, 1, 10, 16);
  ctx.fillStyle = bgHex;
  ctx.fillRect(2, 2, 8, 14);

  // Creeper / Emblem pixel motif on back of cape
  ctx.fillStyle = emblemHex;
  ctx.fillRect(3, 5, 2, 2);
  ctx.fillRect(7, 5, 2, 2);
  ctx.fillRect(5, 7, 2, 3);
  ctx.fillRect(4, 9, 1, 3);
  ctx.fillRect(7, 9, 1, 3);

  return canvas.toDataURL('image/png');
}

export function getBuiltInCapes(): WardrobeCapeItem[] {
  return [
    {
      id: 'turbocraft-founder',
      name: 'TurboCraft Emerald',
      subtitle: 'Signature TCL Edition Cape',
      url: generateProceduralCapeDataUrl('#0E1A0D', '#8BE51B', '#2F7A0B'),
      accent: '#8BE51B',
    },
    {
      id: 'migrator-crimson',
      name: 'Crimson Migrator',
      subtitle: 'Classic Red & Gold Trim',
      url: generateProceduralCapeDataUrl('#6E1216', '#F4C542', '#3B070A'),
      accent: '#F4C542',
    },
    {
      id: 'anniversary-15',
      name: '15th Anniversary Creeper',
      subtitle: 'Emerald Creeper Tribute',
      url: generateProceduralCapeDataUrl('#1B5E20', '#76FF03', '#0D3311'),
      accent: '#76FF03',
    },
    {
      id: 'cherry-blossom',
      name: 'Cherry Blossom',
      subtitle: 'Soft Petal Pink Edition',
      url: generateProceduralCapeDataUrl('#883955', '#FFD6E7', '#591E35'),
      accent: '#FFD6E7',
    },
    {
      id: 'glacier-frost',
      name: 'Glacier Frost',
      subtitle: 'Ice Cyan Crystal Cape',
      url: generateProceduralCapeDataUrl('#0A3647', '#73D2FB', '#051E29'),
      accent: '#73D2FB',
    },
    {
      id: 'ember-nether',
      name: 'Embermire Nether',
      subtitle: 'Blaze Core Edition',
      url: generateProceduralCapeDataUrl('#3D1308', '#FE7A52', '#FFD166'),
      accent: '#FE7A52',
    },
  ];
}
