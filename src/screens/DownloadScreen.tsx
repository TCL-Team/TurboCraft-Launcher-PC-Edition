import React, { useEffect, useState } from 'react';
import { marked } from 'marked';
import {
  Download,
  Search,
  Heart,
  Layers,
  Sparkles,
  Box,
  Palette,
  Globe,
  Sun,
  X,
  Check,
} from 'lucide-react';
import { BootstrapState, ModLoaderType, ScreenRoute } from '../types/launcher';
import { fetchLoaderVersions, fetchMojangVersions, MojangVersionItem } from '../services/mojangMetaApi';
import {
  fetchStoreProjectDetail,
  searchStoreProjects,
  StoreProjectDetail,
  StoreProjectItem,
} from '../services/modrinthApi';
import { tclBridge } from '../bridge/tclBridge';

type DownloadTab = 'game' | 'modpack' | 'mod' | 'resourcepack' | 'saves' | 'shader' | 'favorites';

interface DownloadScreenProps {
  state: BootstrapState;
  initialTab?: DownloadTab;
  onNavigate: (route: ScreenRoute) => void;
  onRefreshState: () => Promise<void>;
  onToast: (msg: string) => void;
}

export const DownloadScreen: React.FC<DownloadScreenProps> = ({
  state,
  initialTab = 'game',
  onNavigate,
  onRefreshState,
  onToast,
}) => {
  const [tab, setTab] = useState<DownloadTab>(initialTab);

  // Game installer state
  const [mcVersions, setMcVersions] = useState<MojangVersionItem[]>([]);
  const [verFilterType, setVerFilterType] = useState<'release' | 'snapshot' | 'old_beta'>('release');
  const [verSearch, setVerSearch] = useState('');
  const [selectedMcVer, setSelectedMcVer] = useState('1.21.4');
  const [selectedLoader, setSelectedLoader] = useState<ModLoaderType>('fabric');
  const [loaderVers, setLoaderVers] = useState<string[]>([]);
  const [selectedLoaderVer, setSelectedLoaderVer] = useState('');
  const [customInstName, setCustomInstName] = useState('1.21.4 • Fabric');

  // Asset Store state
  const [query, setQuery] = useState('');
  const [storeSource, setStoreSource] = useState<'modrinth' | 'curseforge'>('modrinth');
  const [sortBy, setSortBy] = useState<'relevance' | 'downloads' | 'updated' | 'newest'>('relevance');
  const [filterMcVer, setFilterMcVer] = useState('');
  const [results, setResults] = useState<StoreProjectItem[]>([]);
  const [loadingStore, setLoadingStore] = useState(false);
  const [detailModal, setDetailModal] = useState<StoreProjectDetail | null>(null);
  const [targetInstId, setTargetInstId] = useState<string>(state.activeInstanceId || state.instances[0]?.id || '');

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    void fetchMojangVersions().then(setMcVersions);
  }, []);

  useEffect(() => {
    void fetchLoaderVersions(selectedMcVer, selectedLoader).then((list) => {
      setLoaderVers(list);
      setSelectedLoaderVer(list[0] || '');
    });
    const loaderLabel = selectedLoader === 'vanilla' ? 'Vanilla' : selectedLoader[0].toUpperCase() + selectedLoader.slice(1);
    setCustomInstName(`${selectedMcVer} • ${loaderLabel}`);
  }, [selectedMcVer, selectedLoader]);

  useEffect(() => {
    if (tab === 'game' || tab === 'favorites') return;
    setLoadingStore(true);
    const timer = setTimeout(() => {
      void searchStoreProjects({
        query,
        projectType: tab,
        mcVersion: filterMcVer || undefined,
        sort: sortBy,
        source: storeSource,
        curseforgeApiKey: state.settings.curseforgeApiKey,
      })
        .then(setResults)
        .finally(() => setLoadingStore(false));
    }, 220);
    return () => clearTimeout(timer);
  }, [tab, query, sortBy, filterMcVer, storeSource]);

  const filteredMojang = mcVersions.filter(
    (v) =>
      v.type === verFilterType &&
      (!verSearch.trim() || v.id.toLowerCase().includes(verSearch.toLowerCase()))
  );

  const isFavorited = (id: string) => state.favorites.some((f) => f.id === id);

  const installProjectItem = async (item: StoreProjectItem, chosenUrl?: string, chosenFileName?: string) => {
    if (item.projectType === 'modpack') {
      const created = await tclBridge.rpc<{ name: string; id: string }>('installInstance', {
        name: item.title,
        mcVersion: item.versions[0] || '1.21.4',
        loader: 'fabric',
        icon: item.iconUrl,
      });
      await onRefreshState();
      onToast(`Created Modpack instance "${created.name}"!`);
      return;
    }

    const instId = targetInstId || state.activeInstanceId || state.instances[0]?.id;
    if (!instId) {
      onToast('Please install a Minecraft instance first.');
      return;
    }

    const categoryMap: Record<string, 'mods' | 'resourcepacks' | 'shaderpacks' | 'saves'> = {
      mod: 'mods',
      resourcepack: 'resourcepacks',
      shader: 'shaderpacks',
      saves: 'saves',
    };
    const ext = item.projectType === 'mod' ? 'jar' : 'zip';
    await tclBridge.rpc('installAssetToInstance', {
      instanceId: instId,
      category: categoryMap[item.projectType] || 'mods',
      fileName: chosenFileName || `${item.slug}.${ext}`,
      downloadUrl: chosenUrl || `https://cdn.modrinth.com/project/${item.id}`,
    });
    onToast(`Installed ${item.title} into instance!`);
  };

  return (
    <div
      style={{
        padding: 14,
        height: 'calc(100vh - 48px)',
        boxSizing: 'border-box',
        display: 'grid',
        gridTemplateColumns: '215px 1fr',
        gap: 14,
      }}
    >
      {/* Left Navigation Rail (Exact 6 Tabs + Favorites from Mobile DownloadScreen.kt) */}
      <div className="tcl-glass-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.6, padding: '4px 8px' }}>
          DOWNLOAD HUB
        </div>
        {[
          { id: 'game', label: 'Minecraft Game', icon: <Layers size={16} /> },
          { id: 'modpack', label: 'Modpacks', icon: <Box size={16} /> },
          { id: 'mod', label: 'Mods', icon: <Sparkles size={16} /> },
          { id: 'resourcepack', label: 'Resource Packs', icon: <Palette size={16} /> },
          { id: 'saves', label: 'Worlds / Saves', icon: <Globe size={16} /> },
          { id: 'shader', label: 'Shader Packs', icon: <Sun size={16} /> },
          { id: 'favorites', label: `Favorites (${state.favorites.length})`, icon: <Heart size={16} /> },
        ].map((nav) => (
          <button
            key={nav.id}
            type="button"
            onClick={() => setTab(nav.id as DownloadTab)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 13,
              border: 'none',
              background: tab === nav.id ? 'var(--primary)' : 'transparent',
              color: tab === nav.id ? 'var(--on-primary)' : 'var(--on-surface)',
              fontWeight: tab === nav.id ? 800 : 600,
              fontSize: 13,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            {nav.icon} {nav.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      {tab === 'game' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.15fr 1fr',
            gap: 14,
            minHeight: 0,
          }}
        >
          {/* Mojang Version Picker */}
          <div
            className="tcl-glass-card"
            style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}
          >
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {(['release', 'snapshot', 'old_beta'] as const).map((vt) => (
                <button
                  key={vt}
                  type="button"
                  className={verFilterType === vt ? 'tcl-btn tcl-btn-primary' : 'tcl-btn'}
                  onClick={() => setVerFilterType(vt)}
                >
                  {vt === 'release' ? 'Releases' : vt === 'snapshot' ? 'Snapshots' : 'Old Beta'}
                </button>
              ))}
              <input
                className="tcl-input"
                placeholder="Search version (e.g. 1.21.4, 1.20.1, 1.8.9)..."
                value={verSearch}
                onChange={(e) => setVerSearch(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filteredMojang.slice(0, 80).map((ver) => (
                <div
                  key={ver.id}
                  onClick={() => setSelectedMcVer(ver.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 12,
                    background:
                      selectedMcVer === ver.id
                        ? 'rgba(139,229,27,0.16)'
                        : 'rgba(255,255,255,0.04)',
                    border:
                      selectedMcVer === ver.id
                        ? '1.5px solid var(--primary)'
                        : '1px solid rgba(255,255,255,0.07)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img src="./assets/icons/minecraft.png" alt="" style={{ width: 26, height: 26 }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>Minecraft {ver.id}</div>
                      <div style={{ fontSize: 11, opacity: 0.62 }}>Released {ver.releaseTime}</div>
                    </div>
                  </div>
                  {selectedMcVer === ver.id && <Check size={16} color="var(--primary)" />}
                </div>
              ))}
            </div>
          </div>

          {/* Mod Loader & Instance Builder */}
          <div className="tcl-glass-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ margin: 0, fontSize: 17 }}>Configure & Install Instance</h3>

            <div>
              <label style={{ fontSize: 12, opacity: 0.75 }}>Select Mod Loader Add-on</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
                {(
                  [
                    { id: 'vanilla', name: 'Vanilla', icon: './assets/icons/minecraft.png' },
                    { id: 'fabric', name: 'Fabric', icon: './assets/icons/fabric.webp' },
                    { id: 'neoforge', name: 'NeoForge', icon: './assets/icons/neoforge.png' },
                    { id: 'forge', name: 'Forge', icon: './assets/icons/forge.png' },
                    { id: 'quilt', name: 'Quilt', icon: './assets/icons/quilt.webp' },
                    { id: 'optifine', name: 'OptiFine', icon: './assets/icons/optifine.png' },
                  ] as const
                ).map((ldr) => (
                  <button
                    key={ldr.id}
                    type="button"
                    onClick={() => setSelectedLoader(ldr.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 12,
                      border:
                        selectedLoader === ldr.id
                          ? '1.5px solid var(--primary)'
                          : '1px solid rgba(255,255,255,0.09)',
                      background:
                        selectedLoader === ldr.id
                          ? 'rgba(139,229,27,0.14)'
                          : 'rgba(255,255,255,0.04)',
                      color: 'var(--on-surface)',
                      cursor: 'pointer',
                    }}
                  >
                    <img src={ldr.icon} alt="" style={{ width: 24, height: 24, borderRadius: 6, objectFit: 'contain' }} />
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{ldr.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {selectedLoader !== 'vanilla' && (
              <div>
                <label style={{ fontSize: 12, opacity: 0.75 }}>Loader Version</label>
                <select
                  className="tcl-input"
                  value={selectedLoaderVer}
                  onChange={(e) => setSelectedLoaderVer(e.target.value)}
                  style={{ width: '100%', marginTop: 4 }}
                >
                  {loaderVers.map((lv) => (
                    <option key={lv} value={lv}>
                      {selectedLoader.toUpperCase()} {lv}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label style={{ fontSize: 12, opacity: 0.75 }}>Instance Name</label>
              <input
                className="tcl-input"
                value={customInstName}
                onChange={(e) => setCustomInstName(e.target.value)}
                style={{ width: '100%', marginTop: 4 }}
              />
            </div>

            <button
              type="button"
              className="tcl-btn tcl-btn-primary"
              style={{ padding: '12px 18px', justifyContent: 'center', fontSize: 14, marginTop: 'auto' }}
              onClick={async () => {
                const inst = await tclBridge.rpc<{ name: string; id: string }>('installInstance', {
                  name: customInstName,
                  mcVersion: selectedMcVer,
                  loader: selectedLoader,
                  loaderVersion: selectedLoaderVer || undefined,
                });
                await onRefreshState();
                onToast(`Installing "${inst.name}" — check Task Menu for live progress!`);
                onNavigate({ name: 'home' });
              }}
            >
              <Download size={16} /> Install {customInstName}
            </button>
          </div>
        </div>
      ) : tab === 'favorites' ? (
        <div className="tcl-glass-card" style={{ padding: 18, overflowY: 'auto' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 17 }}>Bookmarked Projects</h3>
          {state.favorites.length === 0 ? (
            <div style={{ opacity: 0.65, fontSize: 13 }}>
              Tap the heart icon on any Mod, Modpack, Resource Pack, or Shader to save it here.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 10 }}>
              {state.favorites.map((fav) => (
                <div
                  key={`${fav.source}-${fav.id}`}
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <img
                    src={fav.iconUrl || './assets/icons/modrinth.png'}
                    alt=""
                    style={{ width: 42, height: 42, borderRadius: 10 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{fav.title}</div>
                    <div style={{ fontSize: 11, opacity: 0.65 }}>{fav.type.toUpperCase()} • {fav.source}</div>
                  </div>
                  <button
                    type="button"
                    className="tcl-icon-btn"
                    onClick={async () => {
                      await tclBridge.rpc('toggleFavorite', { item: fav });
                      await onRefreshState();
                    }}
                  >
                    <Heart size={15} fill="#EF4444" color="#EF4444" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Modrinth + CurseForge Browser */
        <div
          className="tcl-glass-card"
          style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}
        >
          {/* Search & Filters Bar */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 210 }}>
              <Search
                size={15}
                style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}
              />
              <input
                className="tcl-input"
                placeholder={`Search ${tab}s on ${storeSource === 'modrinth' ? 'Modrinth' : 'CurseForge'}...`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ width: '100%', paddingLeft: 34 }}
              />
            </div>

            <select
              className="tcl-input"
              value={storeSource}
              onChange={(e) => setStoreSource(e.target.value as 'modrinth' | 'curseforge')}
            >
              <option value="modrinth">Modrinth</option>
              <option value="curseforge">CurseForge</option>
            </select>

            <input
              className="tcl-input"
              placeholder="MC Version (e.g. 1.21.4)"
              value={filterMcVer}
              onChange={(e) => setFilterMcVer(e.target.value)}
              style={{ width: 150 }}
            />

            <select
              className="tcl-input"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="relevance">Sort: Relevance</option>
              <option value="downloads">Sort: Downloads</option>
              <option value="updated">Sort: Recently Updated</option>
              <option value="newest">Sort: Newest</option>
            </select>

            {tab !== 'modpack' && (
              <select
                className="tcl-input"
                value={targetInstId}
                onChange={(e) => setTargetInstId(e.target.value)}
                title="Target Instance for 1-click install"
              >
                {state.instances.map((i) => (
                  <option key={i.id} value={i.id}>
                    Target: {i.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Results Grid */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {loadingStore ? (
              <div style={{ padding: 36, textAlign: 'center', opacity: 0.7 }}>
                Searching {storeSource} catalog...
              </div>
            ) : (
              results.map((item) => (
                <div
                  key={`${item.source}-${item.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '12px 14px',
                    borderRadius: 15,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <img
                    src={item.iconUrl}
                    alt={item.title}
                    style={{ width: 50, height: 50, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }}
                  />
                  <div
                    style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                    onClick={async () => {
                      const detail = await fetchStoreProjectDetail(item);
                      setDetailModal(detail);
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 14.5 }}>{item.title}</span>
                      <span style={{ fontSize: 11.5, opacity: 0.62 }}>by {item.author}</span>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        opacity: 0.76,
                        margin: '3px 0 6px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.description}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 10.5, opacity: 0.7 }}>
                      <span>{(item.downloads / 1000).toFixed(0)}K downloads</span>
                      {item.categories.slice(0, 4).map((cat) => (
                        <span
                          key={cat}
                          style={{
                            padding: '1px 7px',
                            borderRadius: 999,
                            background: 'rgba(255,255,255,0.08)',
                          }}
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className="tcl-icon-btn"
                      onClick={async () => {
                        await tclBridge.rpc('toggleFavorite', {
                          item: {
                            id: item.id,
                            source: item.source,
                            type: item.projectType,
                            title: item.title,
                            iconUrl: item.iconUrl,
                            summary: item.description,
                          },
                        });
                        await onRefreshState();
                      }}
                    >
                      <Heart
                        size={16}
                        fill={isFavorited(item.id) ? '#EF4444' : 'none'}
                        color={isFavorited(item.id) ? '#EF4444' : 'currentColor'}
                      />
                    </button>
                    <button
                      type="button"
                      className="tcl-btn tcl-btn-primary"
                      onClick={() => void installProjectItem(item)}
                    >
                      <Download size={14} /> Install
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Asset Detail Modal */}
      {detailModal && (
        <div className="tcl-modal-backdrop" onClick={() => setDetailModal(null)}>
          <div
            className="tcl-glass-card"
            style={{
              width: 'min(780px, 94vw)',
              maxHeight: '86vh',
              padding: 22,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src={detailModal.iconUrl} alt="" style={{ width: 48, height: 48, borderRadius: 12 }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: 19 }}>{detailModal.title}</h3>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    by {detailModal.author} • {(detailModal.downloads / 1000).toFixed(0)}K downloads
                  </div>
                </div>
              </div>
              <button type="button" className="tcl-icon-btn" onClick={() => setDetailModal(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 14, flex: 1, minHeight: 0 }}>
              <div
                className="tcl-markdown-body"
                style={{
                  overflowY: 'auto',
                  padding: 12,
                  borderRadius: 12,
                  background: 'rgba(0,0,0,0.28)',
                  fontSize: 12.5,
                  lineHeight: 1.55,
                }}
                dangerouslySetInnerHTML={{
                  __html: marked.parse(detailModal.bodyMarkdown || detailModal.description) as string,
                }}
              />
              <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.8 }}>Available Versions</div>
                {detailModal.availableVersions.map((ver) => (
                  <div
                    key={ver.id}
                    style={{
                      padding: '9px 11px',
                      borderRadius: 11,
                      background: 'rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700 }}>{ver.versionNumber}</div>
                      <div style={{ fontSize: 10.5, opacity: 0.65 }}>
                        {ver.gameVersions.slice(0, 3).join(', ')} • {ver.loaders.join(', ')}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="tcl-btn tcl-btn-primary"
                      onClick={async () => {
                        await installProjectItem(detailModal, ver.downloadUrl, ver.fileName);
                        setDetailModal(null);
                      }}
                    >
                      Install
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
