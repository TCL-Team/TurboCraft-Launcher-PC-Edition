import { BuildKeys } from '../generated/buildConfig';

export type AssetProjectType = 'mod' | 'modpack' | 'resourcepack' | 'shader' | 'datapack';

export interface StoreProjectItem {
  id: string;
  slug: string;
  source: 'modrinth' | 'curseforge';
  projectType: string;
  title: string;
  author: string;
  description: string;
  iconUrl: string;
  downloads: number;
  follows: number;
  categories: string[];
  versions: string[];
  updatedAt: string;
}

export interface StoreProjectVersion {
  id: string;
  name: string;
  versionNumber: string;
  gameVersions: string[];
  loaders: string[];
  fileName: string;
  downloadUrl: string;
  sizeBytes: number;
}

export interface StoreProjectDetail extends StoreProjectItem {
  bodyMarkdown: string;
  galleryUrls: string[];
  availableVersions: StoreProjectVersion[];
}

const FALLBACK_CATALOG: StoreProjectItem[] = [
  {
    id: 'AANobbMI',
    slug: 'sodium',
    source: 'modrinth',
    projectType: 'mod',
    title: 'Sodium',
    author: 'jellysquid3',
    description: 'The fastest and most compatible rendering optimization mod for Minecraft: Java Edition.',
    iconUrl: './assets/icons/fabric.webp',
    downloads: 48200000,
    follows: 142000,
    categories: ['optimization', 'fabric', 'neoforge'],
    versions: ['1.21.4', '1.21.1', '1.20.1'],
    updatedAt: '2026-10-12',
  },
  {
    id: 'P7dR8mSH',
    slug: 'fabric-api',
    source: 'modrinth',
    projectType: 'mod',
    title: 'Fabric API',
    author: 'modmuss50',
    description: 'Lightweight and modular API providing common hooks and intercompatibility utilized by Fabric mods.',
    iconUrl: './assets/icons/fabric.webp',
    downloads: 94000000,
    follows: 98000,
    categories: ['library', 'fabric'],
    versions: ['1.21.4', '1.21.1', '1.20.4', '1.20.1'],
    updatedAt: '2026-11-01',
  },
  {
    id: 'YL57xq9U',
    slug: 'iris',
    source: 'modrinth',
    projectType: 'mod',
    title: 'Iris Shaders',
    author: 'coderbot',
    description: 'A modern shader pack loader for Minecraft intended to be compatible with existing OptiFine shader packs.',
    iconUrl: './assets/icons/modrinth.png',
    downloads: 36500000,
    follows: 87000,
    categories: ['shaders', 'fabric', 'neoforge'],
    versions: ['1.21.4', '1.21.1', '1.20.1'],
    updatedAt: '2026-10-20',
  },
  {
    id: '1eAoo2KR',
    slug: 'fabulously-optimized',
    source: 'modrinth',
    projectType: 'modpack',
    title: 'Fabulously Optimized',
    author: 'robotkoer',
    description: 'Simply optimized Minecraft modpack focusing on performance and graphics enhancements.',
    iconUrl: './assets/icons/modrinth.png',
    downloads: 12900000,
    follows: 49000,
    categories: ['optimization', 'multiplayer', 'lightweight'],
    versions: ['1.21.4', '1.21.1', '1.20.1'],
    updatedAt: '2026-11-02',
  },
  {
    id: 'R6NEzAwj',
    slug: 'complementary-unbound',
    source: 'modrinth',
    projectType: 'shader',
    title: 'Complementary Shaders - Unbound',
    author: 'EminGT',
    description: 'Transforming the visuals of Minecraft with exceptional quality, detail, and performance.',
    iconUrl: './assets/icons/optifine.png',
    downloads: 29400000,
    follows: 64000,
    categories: ['realistic', 'atmosphere', 'high'],
    versions: ['1.21.4', '1.20.1'],
    updatedAt: '2026-09-29',
  },
  {
    id: 'x1hIzbuY',
    slug: 'fresh-animations',
    source: 'modrinth',
    projectType: 'resourcepack',
    title: 'Fresh Animations',
    author: 'FreshLX',
    description: 'Dynamic animated overhaul to creatures and mobs in default Minecraft look.',
    iconUrl: './assets/icons/grass_block.png',
    downloads: 18500000,
    follows: 52000,
    categories: ['mobs', 'tweaks', '16x'],
    versions: ['1.21.4', '1.20.1'],
    updatedAt: '2026-10-08',
  },
];

export async function searchStoreProjects(params: {
  query: string;
  projectType: 'mod' | 'modpack' | 'resourcepack' | 'shader' | 'saves';
  mcVersion?: string;
  loader?: string;
  sort?: 'relevance' | 'downloads' | 'updated' | 'newest';
  source?: 'modrinth' | 'curseforge';
  curseforgeApiKey?: string;
}): Promise<StoreProjectItem[]> {
  const cfKey = (params.curseforgeApiKey || BuildKeys.CURSEFORGE_API_KEY || '').trim();
  if (params.source === 'curseforge' && cfKey) {
    try {
      const classIdMap: Record<string, number> = {
        mod: 6,
        modpack: 4471,
        resourcepack: 12,
        shader: 6552,
        saves: 17,
      };
      const url = new URL('https://api.curseforge.com/v1/mods/search');
      url.searchParams.set('gameId', '432');
      url.searchParams.set('classId', String(classIdMap[params.projectType] || 6));
      if (params.query.trim()) url.searchParams.set('searchFilter', params.query.trim());
      if (params.mcVersion) url.searchParams.set('gameVersion', params.mcVersion);
      url.searchParams.set('pageSize', '24');

      const res = await fetch(url.toString(), {
        headers: { 'x-api-key': cfKey, Accept: 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        return (json.data || []).map((m: any) => ({
          id: String(m.id),
          slug: m.slug || String(m.id),
          source: 'curseforge',
          projectType: params.projectType,
          title: m.name,
          author: m.authors?.[0]?.name || 'CurseForge Creator',
          description: m.summary || '',
          iconUrl: m.logo?.thumbnailUrl || './assets/icons/curseforge.png',
          downloads: m.downloadCount || 0,
          follows: m.thumbsUpCount || 0,
          categories: (m.categories || []).map((c: any) => c.name).slice(0, 4),
          versions: (m.latestFilesIndexes || []).map((f: any) => f.gameVersion).slice(0, 4),
          updatedAt: (m.dateModified || '').slice(0, 10),
        }));
      }
    } catch {
      // fall through
    }
  }

  try {
    const facets: string[][] = [];
    if (params.projectType === 'saves') {
      facets.push(['project_type:datapack', 'project_type:modpack']);
    } else {
      facets.push([`project_type:${params.projectType}`]);
    }
    if (params.mcVersion) {
      facets.push([`versions:${params.mcVersion}`]);
    }
    if (params.loader && params.loader !== 'vanilla' && (params.projectType === 'mod' || params.projectType === 'modpack')) {
      facets.push([`categories:${params.loader}`]);
    }

    const url = new URL('https://api.modrinth.com/v2/search');
    if (params.query.trim()) {
      url.searchParams.set('query', params.query.trim());
    }
    url.searchParams.set('index', params.sort || 'relevance');
    url.searchParams.set('limit', '24');
    url.searchParams.set('facets', JSON.stringify(facets));

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Modrinth HTTP ${res.status}`);
    const data = await res.json();

    return (data.hits || []).map((h: any) => ({
      id: h.project_id,
      slug: h.slug,
      source: 'modrinth',
      projectType: params.projectType,
      title: h.title,
      author: h.author || 'Modrinth Creator',
      description: h.description || '',
      iconUrl: h.icon_url || './assets/icons/modrinth.png',
      downloads: h.downloads || 0,
      follows: h.follows || 0,
      categories: (h.display_categories || h.categories || []).slice(0, 5),
      versions: (h.versions || []).slice(-4).reverse(),
      updatedAt: (h.date_modified || '').slice(0, 10),
    }));
  } catch {
    return FALLBACK_CATALOG.filter(
      (item) =>
        (params.projectType === 'saves' || item.projectType === params.projectType) &&
        (!params.query.trim() ||
          item.title.toLowerCase().includes(params.query.toLowerCase()) ||
          item.description.toLowerCase().includes(params.query.toLowerCase()))
    );
  }
}

export async function fetchStoreProjectDetail(item: StoreProjectItem): Promise<StoreProjectDetail> {
  try {
    if (item.source === 'modrinth') {
      const [projRes, verRes] = await Promise.all([
        fetch(`https://api.modrinth.com/v2/project/${encodeURIComponent(item.id)}`),
        fetch(`https://api.modrinth.com/v2/project/${encodeURIComponent(item.id)}/version`),
      ]);
      if (projRes.ok && verRes.ok) {
        const proj = await projRes.json();
        const vers = await verRes.json();
        return {
          ...item,
          bodyMarkdown: proj.body || item.description,
          galleryUrls: (proj.gallery || []).map((g: any) => g.url).filter(Boolean),
          availableVersions: (Array.isArray(vers) ? vers.slice(0, 30) : []).map((v: any) => {
            const primaryFile = v.files?.find((f: any) => f.primary) || v.files?.[0];
            return {
              id: v.id,
              name: v.name || v.version_number,
              versionNumber: v.version_number,
              gameVersions: v.game_versions || [],
              loaders: v.loaders || [],
              fileName: primaryFile?.filename || `${item.slug}-${v.version_number}.jar`,
              downloadUrl: primaryFile?.url || '',
              sizeBytes: primaryFile?.size || 0,
            };
          }),
        };
      }
    }
  } catch {
    // fallback below
  }

  return {
    ...item,
    bodyMarkdown: `# ${item.title}\n\n${item.description}\n\n- **Author:** ${item.author}\n- **Supported Versions:** ${item.versions.join(', ')}`,
    galleryUrls: [],
    availableVersions: [
      {
        id: `${item.id}-latest`,
        name: `${item.title} Latest`,
        versionNumber: '1.0.0',
        gameVersions: item.versions,
        loaders: ['fabric', 'neoforge', 'forge'],
        fileName: `${item.slug}-latest.${item.projectType === 'mod' ? 'jar' : item.projectType === 'modpack' ? 'mrpack' : 'zip'}`,
        downloadUrl: '',
        sizeBytes: 1024 * 512,
      },
    ],
  };
}
