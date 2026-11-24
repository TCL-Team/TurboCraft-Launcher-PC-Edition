import { LauncherAccount } from '../types/launcher';
import { BuildKeys } from '../generated/buildConfig';

const SUPABASE_BASE = BuildKeys.SOCIAL_SUPABASE_URL.replace(/\/+$/, '');

export const CHAT_BACKEND = {
  PROJECT_URL: SUPABASE_BASE,
  PUBLISHABLE_KEY: BuildKeys.SOCIAL_SUPABASE_PUBLISHABLE_KEY,
  SESSION_FUNCTION: `${SUPABASE_BASE}/functions/v1/chat-account-session`,
  RECOVERY_FUNCTION: `${SUPABASE_BASE}/functions/v1/chat-account-recovery`,
};

const PARTY_SELECT =
  'id,host_id,title,version_id,instance_name,mc_version,loader,modpack_source,modpack_id,' +
  'modpack_icon_url,server_address,max_members,is_public,invite_code,created_at,expires_at,' +
  'chat_party_members(user_id,is_host,joined_at,chat_profiles(username,display_name,last_active_at))';

const PARTY_MESSAGE_SELECT =
  'id,party_id,sender_id,body,created_at,chat_profiles(username,display_name)';

export interface ChatAuthSession {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAtMillis: number;
  launcherAccountId: string;
}

export interface ChatProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  lastActiveAtMillis: number | null;
}

export interface ChatFriend {
  userId: string;
  username: string;
  displayName: string;
  conversationId: string;
  lastActiveAtMillis: number | null;
}

export interface ChatFriendRequest {
  id: string;
  senderId: string;
  username: string;
  displayName: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  editedAt?: string | null;
}

export interface ChatNotification {
  id: string;
  senderId: string;
  senderUsername: string;
  senderDisplayName: string;
  conversationId: string;
  messageId: string;
  preview: string;
  createdAt: string;
}

export interface PartyMember {
  userId: string;
  username: string;
  displayName: string;
  isHost: boolean;
  lastActiveAtMillis: number | null;
  joinedAtMillis: number;
}

export interface SocialParty {
  id: string;
  hostId: string;
  title: string;
  versionId?: string;
  instanceName?: string;
  mcVersion?: string;
  loader?: string;
  serverAddress?: string;
  maxMembers: number;
  isPublic: boolean;
  inviteCode: string;
  createdAtMillis: number;
  expiresAtMillis: number;
  members: PartyMember[];
}

export interface PartyInvite {
  id: string;
  partyId: string;
  fromId: string;
  fromUsername: string;
  fromDisplayName: string;
  partyTitle: string;
  mcVersion?: string;
  loader?: string;
  instanceName?: string;
  maxMembers: number;
  memberCount: number;
}

export interface PartyMessage {
  id: string;
  partyId: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  body: string;
  createdAtMillis: number;
  pending?: boolean;
}

export class ChatApiError extends Error {
  constructor(
    message: string,
    public statusCode = 0,
    public responseBody = ''
  ) {
    super(message);
  }
}

function decodeJwtSub(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(b64));
    return typeof json.sub === 'string' && json.sub ? json.sub : null;
  } catch {
    return null;
  }
}

function parseMillis(iso?: string | null): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

export function getPresenceStatus(lastActiveAtMillis: number | null): 'ONLINE' | 'IDLE' | 'OFFLINE' {
  if (!lastActiveAtMillis || lastActiveAtMillis <= 0) return 'OFFLINE';
  const age = Math.max(0, Date.now() - lastActiveAtMillis);
  if (age <= 2 * 60_000) return 'ONLINE';
  if (age <= 15 * 60_000) return 'IDLE';
  return 'OFFLINE';
}

export function formatLastSeen(lastActiveAtMillis: number | null): string {
  const status = getPresenceStatus(lastActiveAtMillis);
  if (status === 'ONLINE') return 'Online · ready to play';
  if (status === 'IDLE') return 'Away';
  if (!lastActiveAtMillis) return 'Offline';
  const mins = Math.floor(Math.max(0, Date.now() - lastActiveAtMillis) / 60_000);
  if (mins < 2) return 'Last seen just now';
  if (mins < 60) return `Last seen ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Last seen ${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days < 30 ? `Last seen ${days}d ago` : 'Offline';
}

export function suggestedHandleFromAccount(account: LauncherAccount): string {
  const cleaned = account.username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, '_')
    .replace(/^[_.]+|[_.]+$/g, '')
    .slice(0, 20);
  return cleaned.length >= 3 ? cleaned : `player_${account.uuid.replace(/-/g, '').slice(0, 5)}`;
}

function sessionStorageKey(accountId: string): string {
  return `tcl_pc_social_session_${accountId}`;
}

export function loadCachedSocialSession(accountId: string): ChatAuthSession | null {
  try {
    const raw = localStorage.getItem(sessionStorageKey(accountId));
    if (!raw) return null;
    return JSON.parse(raw) as ChatAuthSession;
  } catch {
    return null;
  }
}

export function saveCachedSocialSession(session: ChatAuthSession): void {
  try {
    localStorage.setItem(sessionStorageKey(session.launcherAccountId), JSON.stringify(session));
  } catch {
    // ignore
  }
}

export function clearCachedSocialSession(accountId: string): void {
  try {
    localStorage.removeItem(sessionStorageKey(accountId));
  } catch {
    // ignore
  }
}

async function sbFetch(url: string, init: RequestInit): Promise<any> {
  const res = await fetch(url, init);
  const text = await res.text();
  if (!res.ok) {
    if (/chat_profiles_username_unique|duplicate key value/i.test(text)) {
      throw new ChatApiError('That @handle is already taken.', res.status, text);
    }
    let parsedMsg = '';
    try {
      const obj = JSON.parse(text);
      parsedMsg = obj.msg || obj.message || obj.error_description || obj.details || obj.error || '';
    } catch {
      // ignore
    }
    throw new ChatApiError(parsedMsg || `Social request failed (HTTP ${res.status})`, res.status, text);
  }
  if (!text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function authHeaders(session: ChatAuthSession, extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: CHAT_BACKEND.PUBLISHABLE_KEY,
    Authorization: `Bearer ${session.accessToken}`,
    'Content-Type': 'application/json',
    ...(extra || {}),
  };
}

function parseSessionObject(raw: any, accountId: string, fallbackUserId = ''): ChatAuthSession {
  const sessionObj = raw?.session || raw;
  const accessToken: string = sessionObj?.access_token || '';
  const refreshToken: string = sessionObj?.refresh_token || '';
  const expiresIn = Number(sessionObj?.expires_in || 3600);
  const expiresAtSec = Number(sessionObj?.expires_at || 0);
  const expiresAtMillis = expiresAtSec > 0 ? expiresAtSec * 1000 : Date.now() + expiresIn * 1000;
  const userId =
    decodeJwtSub(accessToken) ||
    sessionObj?.user?.id ||
    raw?.user?.id ||
    raw?.user_id ||
    fallbackUserId;

  if (!accessToken || !userId) {
    throw new ChatApiError('Invalid session returned by Social server.', 500, JSON.stringify(raw));
  }
  const s: ChatAuthSession = {
    userId,
    accessToken,
    refreshToken,
    expiresAtMillis,
    launcherAccountId: accountId,
  };
  saveCachedSocialSession(s);
  return s;
}

export async function createOrRestoreSocialSession(
  account: LauncherAccount,
  forceNew = false
): Promise<ChatAuthSession> {
  if (!forceNew) {
    const cached = loadCachedSocialSession(account.id);
    if (cached && cached.expiresAtMillis > Date.now() + 60_000) {
      return cached;
    }
    if (cached && cached.refreshToken) {
      try {
        const refreshed = await sbFetch(
          `${CHAT_BACKEND.PROJECT_URL}/auth/v1/token?grant_type=refresh_token`,
          {
            method: 'POST',
            headers: {
              apikey: CHAT_BACKEND.PUBLISHABLE_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: cached.refreshToken }),
          }
        );
        return parseSessionObject(refreshed, account.id, cached.userId);
      } catch {
        clearCachedSocialSession(account.id);
      }
    }
  }

  const isMs = account.type === 'microsoft' && account.accessToken && account.accessToken !== '0';
  const identityId = isMs ? account.uuid.replace(/-/g, '').toLowerCase() : account.uuid.toLowerCase();
  const payload: Record<string, string> = {
    identity_type: isMs ? 'microsoft' : 'offline',
    identity_id: identityId,
  };
  if (isMs) payload.minecraft_access_token = account.accessToken;

  const raw = await sbFetch(CHAT_BACKEND.SESSION_FUNCTION, {
    method: 'POST',
    headers: {
      apikey: CHAT_BACKEND.PUBLISHABLE_KEY,
      Authorization: `Bearer ${CHAT_BACKEND.PUBLISHABLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return parseSessionObject(raw, account.id);
}

export async function recoverSocialAccount(
  account: LauncherAccount,
  username: string,
  recoveryCode: string
): Promise<ChatAuthSession> {
  const isMs = account.type === 'microsoft' && account.accessToken && account.accessToken !== '0';
  const payload: Record<string, string> = {
    action: 'recover',
    username: username.replace(/^@/, '').trim().toLowerCase(),
    recovery_code: recoveryCode.trim(),
    identity_type: isMs ? 'microsoft' : 'offline',
    identity_id: isMs ? account.uuid.replace(/-/g, '').toLowerCase() : account.uuid.toLowerCase(),
  };
  if (isMs) payload.minecraft_access_token = account.accessToken;

  const raw = await sbFetch(CHAT_BACKEND.RECOVERY_FUNCTION, {
    method: 'POST',
    headers: {
      apikey: CHAT_BACKEND.PUBLISHABLE_KEY,
      Authorization: `Bearer ${CHAT_BACKEND.PUBLISHABLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return parseSessionObject(raw, account.id);
}

export async function setSocialRecoveryCode(session: ChatAuthSession, recoveryCode: string): Promise<void> {
  await sbFetch(CHAT_BACKEND.RECOVERY_FUNCTION, {
    method: 'POST',
    headers: authHeaders(session),
    body: JSON.stringify({ action: 'set', recovery_code: recoveryCode.trim() }),
  });
}

function mapProfile(row: any): ChatProfile {
  return {
    id: String(row.id || ''),
    username: String(row.username || ''),
    displayName: String(row.display_name || row.username || 'Player'),
    bio: String(row.bio || ''),
    lastActiveAtMillis: parseMillis(row.last_active_at),
  };
}

export async function getOwnSocialProfile(session: ChatAuthSession): Promise<ChatProfile | null> {
  const rows = await sbFetch(
    `${CHAT_BACKEND.PROJECT_URL}/rest/v1/chat_profiles?select=id,username,display_name,bio,last_active_at&id=eq.${encodeURIComponent(session.userId)}&limit=1`,
    { headers: authHeaders(session) }
  );
  if (Array.isArray(rows) && rows[0]) return mapProfile(rows[0]);
  return null;
}

export async function ensureSocialProfile(
  session: ChatAuthSession,
  username: string,
  displayName: string
): Promise<ChatProfile> {
  const cleanHandle = username.replace(/^@/, '').trim().toLowerCase();
  const res = await sbFetch(`${CHAT_BACKEND.PROJECT_URL}/rest/v1/rpc/ensure_chat_profile`, {
    method: 'POST',
    headers: authHeaders(session),
    body: JSON.stringify({
      p_username: cleanHandle,
      p_display_name: displayName.trim() || cleanHandle,
    }),
  });
  const row = Array.isArray(res) ? res[0] : res;
  if (!row || !row.id) throw new ChatApiError('Server did not return created profile.');
  return mapProfile(row);
}

export async function updateSocialProfile(
  session: ChatAuthSession,
  username: string,
  displayName: string,
  bio: string
): Promise<ChatProfile> {
  const rows = await sbFetch(
    `${CHAT_BACKEND.PROJECT_URL}/rest/v1/chat_profiles?id=eq.${encodeURIComponent(session.userId)}&select=id,username,display_name,bio,last_active_at`,
    {
      method: 'PATCH',
      headers: authHeaders(session, { Prefer: 'return=representation' }),
      body: JSON.stringify({
        username: username.replace(/^@/, '').trim().toLowerCase(),
        display_name: displayName.trim(),
        bio: bio.trim(),
      }),
    }
  );
  if (Array.isArray(rows) && rows[0]) return mapProfile(rows[0]);
  throw new ChatApiError('Could not update profile.');
}

export async function touchPresence(session: ChatAuthSession): Promise<void> {
  await sbFetch(`${CHAT_BACKEND.PROJECT_URL}/rest/v1/rpc/touch_chat_presence`, {
    method: 'POST',
    headers: authHeaders(session),
    body: '{}',
  });
}

export async function runSocialSelfCheck(session: ChatAuthSession): Promise<string> {
  const res = await sbFetch(`${CHAT_BACKEND.PROJECT_URL}/rest/v1/rpc/chat_self_check`, {
    method: 'POST',
    headers: authHeaders(session),
    body: '{}',
  });
  return typeof res === 'string' ? res : JSON.stringify(res, null, 2);
}

async function fetchProfilesMap(session: ChatAuthSession, ids: string[]): Promise<Map<string, ChatProfile>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  const map = new Map<string, ChatProfile>();
  if (unique.length === 0) return map;
  const rows = await sbFetch(
    `${CHAT_BACKEND.PROJECT_URL}/rest/v1/chat_profiles?select=id,username,display_name,bio,last_active_at&id=in.(${unique.join(',')})`,
    { headers: authHeaders(session) }
  );
  if (Array.isArray(rows)) {
    for (const r of rows) {
      const p = mapProfile(r);
      map.set(p.id, p);
    }
  }
  return map;
}

export async function loadSocialDashboard(session: ChatAuthSession): Promise<{
  friends: ChatFriend[];
  incomingRequests: ChatFriendRequest[];
  unreadNotifications: ChatNotification[];
}> {
  const uid = session.userId;
  const friendships = await sbFetch(
    `${CHAT_BACKEND.PROJECT_URL}/rest/v1/chat_friendships?select=user_a,user_b,conversation_id,created_at&or=(user_a.eq.${uid},user_b.eq.${uid})&order=created_at.desc`,
    { headers: authHeaders(session) }
  );

  const pairs: Array<{ otherId: string; conversationId: string }> = [];
  if (Array.isArray(friendships)) {
    for (const row of friendships) {
      const otherId = row.user_a === uid ? row.user_b : row.user_b === uid ? row.user_a : '';
      if (otherId && row.conversation_id) {
        pairs.push({ otherId, conversationId: row.conversation_id });
      }
    }
  }

  const reqRows = await sbFetch(
    `${CHAT_BACKEND.PROJECT_URL}/rest/v1/chat_friend_requests?select=id,sender_id,receiver_id,created_at&receiver_id=eq.${uid}&status=eq.pending&order=created_at.desc`,
    { headers: authHeaders(session) }
  );

  const notifRows = await sbFetch(
    `${CHAT_BACKEND.PROJECT_URL}/rest/v1/chat_notifications?select=id,sender_id,conversation_id,message_id,message_preview,created_at&recipient_id=eq.${uid}&read_at=is.null&order=created_at.desc&limit=200`,
    { headers: authHeaders(session) }
  );

  const allUserIds = [
    ...pairs.map((p) => p.otherId),
    ...(Array.isArray(reqRows) ? reqRows.map((r: any) => r.sender_id) : []),
    ...(Array.isArray(notifRows) ? notifRows.map((n: any) => n.sender_id) : []),
  ];
  const profMap = await fetchProfilesMap(session, allUserIds);

  const friends: ChatFriend[] = pairs
    .map((p) => {
      const prof = profMap.get(p.otherId);
      if (!prof) return null;
      return {
        userId: prof.id,
        username: prof.username,
        displayName: prof.displayName,
        conversationId: p.conversationId,
        lastActiveAtMillis: prof.lastActiveAtMillis,
      };
    })
    .filter(Boolean) as ChatFriend[];

  const incomingRequests: ChatFriendRequest[] = (Array.isArray(reqRows) ? reqRows : [])
    .map((r: any) => {
      const prof = profMap.get(r.sender_id);
      if (!prof) return null;
      return {
        id: r.id,
        senderId: r.sender_id,
        username: prof.username,
        displayName: prof.displayName,
        createdAt: r.created_at,
      };
    })
    .filter(Boolean) as ChatFriendRequest[];

  const unreadNotifications: ChatNotification[] = (Array.isArray(notifRows) ? notifRows : [])
    .map((n: any) => {
      const prof = profMap.get(n.sender_id);
      return {
        id: n.id,
        senderId: n.sender_id,
        senderUsername: prof?.username || 'player',
        senderDisplayName: prof?.displayName || 'Player',
        conversationId: n.conversation_id,
        messageId: n.message_id,
        preview: n.message_preview || '',
        createdAt: n.created_at,
      };
    });

  return { friends, incomingRequests, unreadNotifications };
}

export async function sendFriendRequestByHandle(session: ChatAuthSession, handle: string): Promise<void> {
  await sbFetch(`${CHAT_BACKEND.PROJECT_URL}/rest/v1/rpc/send_chat_friend_request`, {
    method: 'POST',
    headers: authHeaders(session),
    body: JSON.stringify({ target_username: handle.replace(/^@/, '').trim().toLowerCase() }),
  });
}

export async function respondFriendRequest(
  session: ChatAuthSession,
  requestId: string,
  accept: boolean
): Promise<void> {
  await sbFetch(`${CHAT_BACKEND.PROJECT_URL}/rest/v1/rpc/respond_chat_friend_request`, {
    method: 'POST',
    headers: authHeaders(session),
    body: JSON.stringify({ request_id: requestId, accept }),
  });
}

export async function loadDirectMessages(
  session: ChatAuthSession,
  conversationId: string
): Promise<ChatMessage[]> {
  const rows = await sbFetch(
    `${CHAT_BACKEND.PROJECT_URL}/rest/v1/chat_messages?select=id,conversation_id,sender_id,body,created_at,edited_at&conversation_id=eq.${encodeURIComponent(conversationId)}&order=created_at.asc&limit=120`,
    { headers: authHeaders(session) }
  );
  return (Array.isArray(rows) ? rows : []).map((r: any) => ({
    id: r.id,
    conversationId: r.conversation_id,
    senderId: r.sender_id,
    body: r.body,
    createdAt: r.created_at,
    editedAt: r.edited_at,
  }));
}

export async function sendDirectMessage(
  session: ChatAuthSession,
  conversationId: string,
  body: string
): Promise<ChatMessage> {
  const rows = await sbFetch(
    `${CHAT_BACKEND.PROJECT_URL}/rest/v1/chat_messages?select=id,conversation_id,sender_id,body,created_at,edited_at`,
    {
      method: 'POST',
      headers: authHeaders(session, { Prefer: 'return=representation' }),
      body: JSON.stringify({
        conversation_id: conversationId,
        sender_id: session.userId,
        body: body.trim(),
      }),
    }
  );
  const r = Array.isArray(rows) ? rows[0] : rows;
  return {
    id: r.id,
    conversationId: r.conversation_id,
    senderId: r.sender_id,
    body: r.body,
    createdAt: r.created_at,
    editedAt: r.edited_at,
  };
}

export async function editDirectMessage(
  session: ChatAuthSession,
  messageId: string,
  conversationId: string,
  body: string
): Promise<void> {
  await sbFetch(
    `${CHAT_BACKEND.PROJECT_URL}/rest/v1/chat_messages?id=eq.${encodeURIComponent(messageId)}&conversation_id=eq.${encodeURIComponent(conversationId)}&sender_id=eq.${encodeURIComponent(session.userId)}`,
    {
      method: 'PATCH',
      headers: authHeaders(session, { Prefer: 'return=representation' }),
      body: JSON.stringify({ body: body.trim() }),
    }
  );
}

export async function deleteDirectMessage(
  session: ChatAuthSession,
  messageId: string,
  conversationId: string
): Promise<void> {
  await sbFetch(
    `${CHAT_BACKEND.PROJECT_URL}/rest/v1/chat_messages?id=eq.${encodeURIComponent(messageId)}&conversation_id=eq.${encodeURIComponent(conversationId)}&sender_id=eq.${encodeURIComponent(session.userId)}`,
    {
      method: 'DELETE',
      headers: authHeaders(session, { Prefer: 'return=representation' }),
    }
  );
}

export async function markNotificationsRead(
  session: ChatAuthSession,
  conversationId: string
): Promise<void> {
  await sbFetch(
    `${CHAT_BACKEND.PROJECT_URL}/rest/v1/rpc/mark_chat_conversation_notifications_read`,
    {
      method: 'POST',
      headers: authHeaders(session),
      body: JSON.stringify({ p_conversation_id: conversationId }),
    }
  );
}

// ===================== PARTIES =====================

function mapParty(row: any): SocialParty | null {
  if (!row?.id) return null;
  const members: PartyMember[] = Array.isArray(row.chat_party_members)
    ? row.chat_party_members.map((m: any) => ({
        userId: String(m.user_id || ''),
        username: String(m.chat_profiles?.username || String(m.user_id || '').slice(0, 8)),
        displayName: String(
          m.chat_profiles?.display_name || m.chat_profiles?.username || 'Player'
        ),
        isHost: Boolean(m.is_host),
        lastActiveAtMillis: parseMillis(m.chat_profiles?.last_active_at),
        joinedAtMillis: parseMillis(m.joined_at) || 0,
      }))
    : [];

  return {
    id: row.id,
    hostId: row.host_id || '',
    title: row.title || 'Minecraft Party',
    versionId: row.version_id || undefined,
    instanceName: row.instance_name || undefined,
    mcVersion: row.mc_version || undefined,
    loader: row.loader || undefined,
    serverAddress: row.server_address || undefined,
    maxMembers: Number(row.max_members || 4),
    isPublic: Boolean(row.is_public),
    inviteCode: String(row.invite_code || ''),
    createdAtMillis: parseMillis(row.created_at) || 0,
    expiresAtMillis: parseMillis(row.expires_at) || 0,
    members,
  };
}

export async function loadPartiesDashboard(session: ChatAuthSession): Promise<{
  myParties: SocialParty[];
  publicParties: SocialParty[];
  invites: PartyInvite[];
}> {
  const memRows = await sbFetch(
    `${CHAT_BACKEND.PROJECT_URL}/rest/v1/chat_party_members?select=party_id&user_id=eq.${encodeURIComponent(session.userId)}`,
    { headers: authHeaders(session) }
  );
  const myPartyIds = Array.from(
    new Set((Array.isArray(memRows) ? memRows : []).map((r: any) => r.party_id).filter(Boolean))
  );

  let myParties: SocialParty[] = [];
  if (myPartyIds.length > 0) {
    const pRows = await sbFetch(
      `${CHAT_BACKEND.PROJECT_URL}/rest/v1/chat_parties?select=${encodeURIComponent(PARTY_SELECT)}&id=in.(${myPartyIds.join(',')})&order=created_at.desc`,
      { headers: authHeaders(session) }
    );
    myParties = (Array.isArray(pRows) ? pRows : [])
      .map(mapParty)
      .filter((p): p is SocialParty => Boolean(p && (!p.expiresAtMillis || p.expiresAtMillis > Date.now())));
  }

  const pubRows = await sbFetch(
    `${CHAT_BACKEND.PROJECT_URL}/rest/v1/chat_parties?select=${encodeURIComponent(PARTY_SELECT)}&is_public=eq.true&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&order=created_at.desc&limit=30`,
    { headers: authHeaders(session) }
  );
  const publicParties = (Array.isArray(pubRows) ? pubRows : [])
    .map(mapParty)
    .filter((p): p is SocialParty => Boolean(p && !myParties.some((m) => m.id === p.id)));

  const invRows = await sbFetch(
    `${CHAT_BACKEND.PROJECT_URL}/rest/v1/chat_party_invites?select=id,party_id,from_id,to_id,status,created_at&to_id=eq.${encodeURIComponent(session.userId)}&status=eq.pending&order=created_at.desc`,
    { headers: authHeaders(session) }
  );

  let invites: PartyInvite[] = [];
  if (Array.isArray(invRows) && invRows.length > 0) {
    const pIds = Array.from(new Set(invRows.map((i: any) => i.party_id).filter(Boolean)));
    const fIds = Array.from(new Set(invRows.map((i: any) => i.from_id).filter(Boolean)));
    const [partyRows, profMap] = await Promise.all([
      pIds.length
        ? sbFetch(
            `${CHAT_BACKEND.PROJECT_URL}/rest/v1/chat_parties?select=${encodeURIComponent(PARTY_SELECT)}&id=in.(${pIds.join(',')})`,
            { headers: authHeaders(session) }
          ).catch(() => [])
        : Promise.resolve([]),
      fetchProfilesMap(session, fIds),
    ]);
    const partyMap = new Map<string, SocialParty>();
    for (const r of Array.isArray(partyRows) ? partyRows : []) {
      const p = mapParty(r);
      if (p) partyMap.set(p.id, p);
    }
    invites = invRows
      .map((row: any) => {
        const p = partyMap.get(row.party_id);
        if (!p) return null;
        const from = profMap.get(row.from_id);
        return {
          id: row.id,
          partyId: p.id,
          fromId: row.from_id,
          fromUsername: from?.username || 'friend',
          fromDisplayName: from?.displayName || 'Friend',
          partyTitle: p.title,
          mcVersion: p.mcVersion,
          loader: p.loader,
          instanceName: p.instanceName,
          maxMembers: p.maxMembers,
          memberCount: p.members.length,
        };
      })
      .filter(Boolean) as PartyInvite[];
  }

  return { myParties, publicParties, invites };
}

export async function createSocialParty(
  session: ChatAuthSession,
  draft: {
    title: string;
    versionId?: string;
    instanceName?: string;
    mcVersion?: string;
    loader?: string;
    serverAddress?: string;
    maxMembers: number;
    isPublic: boolean;
  }
): Promise<string> {
  const res = await sbFetch(`${CHAT_BACKEND.PROJECT_URL}/rest/v1/rpc/create_chat_party`, {
    method: 'POST',
    headers: authHeaders(session),
    body: JSON.stringify({
      p_title: draft.title.trim(),
      p_version_id: draft.versionId,
      p_instance_name: draft.instanceName,
      p_mc_version: draft.mcVersion,
      p_loader: draft.loader,
      p_server_address: draft.serverAddress?.trim() || undefined,
      p_max_members: draft.maxMembers,
      p_is_public: draft.isPublic,
    }),
  });
  return String(res || '');
}

export async function joinSocialPartyByCode(session: ChatAuthSession, code: string): Promise<string> {
  const res = await sbFetch(`${CHAT_BACKEND.PROJECT_URL}/rest/v1/rpc/join_chat_party_by_code`, {
    method: 'POST',
    headers: authHeaders(session),
    body: JSON.stringify({ p_code: code.trim().toUpperCase() }),
  });
  return String(res || '');
}

export async function joinPublicParty(session: ChatAuthSession, partyId: string): Promise<void> {
  await sbFetch(`${CHAT_BACKEND.PROJECT_URL}/rest/v1/rpc/join_chat_party`, {
    method: 'POST',
    headers: authHeaders(session),
    body: JSON.stringify({ p_party_id: partyId }),
  });
}

export async function leaveSocialParty(session: ChatAuthSession, partyId: string): Promise<void> {
  await sbFetch(`${CHAT_BACKEND.PROJECT_URL}/rest/v1/rpc/leave_chat_party`, {
    method: 'POST',
    headers: authHeaders(session),
    body: JSON.stringify({ p_party_id: partyId }),
  });
}

export async function endSocialParty(session: ChatAuthSession, partyId: string): Promise<void> {
  await sbFetch(`${CHAT_BACKEND.PROJECT_URL}/rest/v1/rpc/delete_chat_party`, {
    method: 'POST',
    headers: authHeaders(session),
    body: JSON.stringify({ p_party_id: partyId }),
  });
}

export async function extendSocialParty(session: ChatAuthSession, partyId: string): Promise<void> {
  await sbFetch(`${CHAT_BACKEND.PROJECT_URL}/rest/v1/rpc/refresh_chat_party`, {
    method: 'POST',
    headers: authHeaders(session),
    body: JSON.stringify({ p_party_id: partyId }),
  });
}

export async function inviteFriendToParty(
  session: ChatAuthSession,
  partyId: string,
  username: string
): Promise<void> {
  await sbFetch(`${CHAT_BACKEND.PROJECT_URL}/rest/v1/rpc/invite_to_chat_party`, {
    method: 'POST',
    headers: authHeaders(session),
    body: JSON.stringify({
      p_party_id: partyId,
      p_username: username.replace(/^@/, '').trim().toLowerCase(),
    }),
  });
}

export async function respondPartyInvite(
  session: ChatAuthSession,
  inviteId: string,
  accept: boolean
): Promise<void> {
  await sbFetch(`${CHAT_BACKEND.PROJECT_URL}/rest/v1/rpc/respond_chat_party_invite`, {
    method: 'POST',
    headers: authHeaders(session),
    body: JSON.stringify({ p_invite_id: inviteId, p_accept: accept }),
  });
}

export async function kickMemberFromParty(
  session: ChatAuthSession,
  partyId: string,
  userId: string
): Promise<void> {
  await sbFetch(`${CHAT_BACKEND.PROJECT_URL}/rest/v1/rpc/kick_chat_party_member`, {
    method: 'POST',
    headers: authHeaders(session),
    body: JSON.stringify({ p_party_id: partyId, p_user_id: userId }),
  });
}

export async function loadPartyMessages(
  session: ChatAuthSession,
  partyId: string
): Promise<PartyMessage[]> {
  const rows = await sbFetch(
    `${CHAT_BACKEND.PROJECT_URL}/rest/v1/chat_party_messages?select=${encodeURIComponent(PARTY_MESSAGE_SELECT)}&party_id=eq.${encodeURIComponent(partyId)}&order=created_at.asc&limit=200`,
    { headers: authHeaders(session) }
  );
  return (Array.isArray(rows) ? rows : []).map((r: any) => ({
    id: r.id,
    partyId: r.party_id,
    senderId: r.sender_id,
    senderName: r.chat_profiles?.display_name || r.chat_profiles?.username || 'Player',
    senderUsername: r.chat_profiles?.username || '',
    body: r.body,
    createdAtMillis: parseMillis(r.created_at) || Date.now(),
  }));
}

export async function sendPartyChatMessage(
  session: ChatAuthSession,
  partyId: string,
  body: string
): Promise<PartyMessage> {
  const rows = await sbFetch(
    `${CHAT_BACKEND.PROJECT_URL}/rest/v1/chat_party_messages?select=${encodeURIComponent(PARTY_MESSAGE_SELECT)}`,
    {
      method: 'POST',
      headers: authHeaders(session, { Prefer: 'return=representation' }),
      body: JSON.stringify({
        party_id: partyId,
        sender_id: session.userId,
        body: body.trim(),
      }),
    }
  );
  const r = Array.isArray(rows) ? rows[0] : rows;
  return {
    id: r.id,
    partyId: r.party_id,
    senderId: r.sender_id,
    senderName: r.chat_profiles?.display_name || r.chat_profiles?.username || 'You',
    senderUsername: r.chat_profiles?.username || '',
    body: r.body,
    createdAtMillis: parseMillis(r.created_at) || Date.now(),
  };
}
