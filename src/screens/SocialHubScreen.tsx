import React, { useEffect, useState } from 'react';
import {
  MessageCircle,
  Users,
  Compass,
  UserPlus,
  RefreshCw,
  Send,
  Copy,
  KeyRound,
  Terminal,
  Trash2,
  Edit3,
  Plus,
  Check,
  X,
} from 'lucide-react';
import { BootstrapState } from '../types/launcher';
import {
  ChatApiError,
  ChatAuthSession,
  ChatFriend,
  ChatFriendRequest,
  ChatMessage,
  ChatProfile,
  CHAT_BACKEND,
  clearCachedSocialSession,
  createOrRestoreSocialSession,
  createSocialParty,
  deleteDirectMessage,
  editDirectMessage,
  endSocialParty,
  ensureSocialProfile,
  extendSocialParty,
  formatLastSeen,
  getOwnSocialProfile,
  getPresenceStatus,
  inviteFriendToParty,
  joinPublicParty,
  joinSocialPartyByCode,
  kickMemberFromParty,
  leaveSocialParty,
  loadDirectMessages,
  loadPartiesDashboard,
  loadPartyMessages,
  loadSocialDashboard,
  markNotificationsRead,
  PartyInvite,
  PartyMessage,
  recoverSocialAccount,
  respondFriendRequest,
  respondPartyInvite,
  runSocialSelfCheck,
  sendDirectMessage,
  sendFriendRequestByHandle,
  sendPartyChatMessage,
  setSocialRecoveryCode,
  SocialParty,
  suggestedHandleFromAccount,
  touchPresence,
  updateSocialProfile,
} from '../services/supabaseSocial';

interface SocialHubScreenProps {
  state: BootstrapState;
  onUnreadCountChange: (count: number) => void;
  onToast: (msg: string) => void;
}

export const SocialHubScreen: React.FC<SocialHubScreenProps> = ({
  state,
  onUnreadCountChange,
  onToast,
}) => {
  const activeAccount =
    state.accounts.find((a) => a.id === state.activeAccountId) || state.accounts[0];

  const [session, setSession] = useState<ChatAuthSession | null>(null);
  const [profile, setProfile] = useState<ChatProfile | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [connLog, setConnLog] = useState<string>('Connecting to TurboCraft Social backend...');
  const [showConnDetails, setShowConnDetails] = useState(false);

  // Claim handle / Recovery form
  const [claimHandle, setClaimHandle] = useState('');
  const [claimDisplay, setClaimDisplay] = useState('');
  const [suggestedAlt, setSuggestedAlt] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [recoverHandle, setRecoverHandle] = useState('');
  const [recoverCode, setRecoverCode] = useState('');

  // Main hub tabs
  const [tab, setTab] = useState<'friends' | 'parties' | 'discover' | 'requests' | 'profile'>('friends');

  // Friends & DM state
  const [friends, setFriends] = useState<ChatFriend[]>([]);
  const [requests, setRequests] = useState<ChatFriendRequest[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<ChatFriend | null>(null);
  const [dmMessages, setDmMessages] = useState<ChatMessage[]>([]);
  const [dmInput, setDmInput] = useState('');
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [addFriendInput, setAddFriendInput] = useState('');

  // Parties state
  const [myParties, setMyParties] = useState<SocialParty[]>([]);
  const [publicParties, setPublicParties] = useState<SocialParty[]>([]);
  const [partyInvites, setPartyInvites] = useState<PartyInvite[]>([]);
  const [selectedParty, setSelectedParty] = useState<SocialParty | null>(null);
  const [partyMessages, setPartyMessages] = useState<PartyMessage[]>([]);
  const [partyChatInput, setPartyChatInput] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [inviteHandleInput, setInviteHandleInput] = useState('');

  // Create Party modal
  const [showCreateParty, setShowCreateParty] = useState(false);
  const [partyTitle, setPartyTitle] = useState('');
  const [partyInstId, setPartyInstId] = useState(state.activeInstanceId || state.instances[0]?.id || '');
  const [partyServerIp, setPartyServerIp] = useState('');
  const [partyMaxMembers, setPartyMaxMembers] = useState(6);
  const [partyPublic, setPartyPublic] = useState(true);

  // Profile & Recovery edit
  const [editHandle, setEditHandle] = useState('');
  const [editDisplay, setEditDisplay] = useState('');
  const [editBio, setEditBio] = useState('');
  const [newRecoveryCode, setNewRecoveryCode] = useState('');

  const connectSocial = async (forceReconnect = false) => {
    if (!activeAccount) return;
    setBootstrapping(true);
    try {
      if (forceReconnect) clearCachedSocialSession(activeAccount.id);
      const sess = await createOrRestoreSocialSession(activeAccount, forceReconnect);
      setSession(sess);
      const prof = await getOwnSocialProfile(sess);
      setProfile(prof);

      if (!prof) {
        const baseHandle = suggestedHandleFromAccount(activeAccount);
        setClaimHandle(baseHandle);
        setClaimDisplay(activeAccount.username);
        setConnLog(
          `Connected to ${CHAT_BACKEND.PROJECT_URL}\nUser ID: ${sess.userId}\nStatus: Ready to claim @handle`
        );
      } else {
        setEditHandle(prof.username);
        setEditDisplay(prof.displayName);
        setEditBio(prof.bio);
        await refreshHubData(sess);
        setConnLog(
          `Connected to ${CHAT_BACKEND.PROJECT_URL}\nUser ID: ${sess.userId}\nHandle: @${prof.username}\nStatus: Healthy (HTTP 200)`
        );
      }
    } catch (err) {
      const detail =
        err instanceof ChatApiError
          ? `HTTP ${err.statusCode}: ${err.message}\nResponse: ${err.responseBody}`
          : String(err);
      setConnLog(`Connection Error:\n${detail}`);
    } finally {
      setBootstrapping(false);
    }
  };

  const refreshHubData = async (sess: ChatAuthSession) => {
    const [dash, pDash] = await Promise.all([
      loadSocialDashboard(sess),
      loadPartiesDashboard(sess),
      touchPresence(sess).catch(() => undefined),
    ]);
    setFriends(dash.friends);
    setRequests(dash.incomingRequests);
    onUnreadCountChange(dash.unreadNotifications.length + dash.incomingRequests.length + pDash.invites.length);
    setMyParties(pDash.myParties);
    setPublicParties(pDash.publicParties);
    setPartyInvites(pDash.invites);
    if (!selectedParty && pDash.myParties[0]) {
      setSelectedParty(pDash.myParties[0]);
    }
  };

  useEffect(() => {
    void connectSocial(false);
  }, [activeAccount?.id]);

  // 60-second presence heartbeat
  useEffect(() => {
    if (!session || !profile) return;
    const timer = setInterval(() => {
      void refreshHubData(session).catch(() => undefined);
    }, 45_000);
    return () => clearInterval(timer);
  }, [session?.userId, profile?.id]);

  useEffect(() => {
    if (!session || !selectedFriend) return;
    void loadDirectMessages(session, selectedFriend.conversationId)
      .then(setDmMessages)
      .then(() => markNotificationsRead(session, selectedFriend.conversationId))
      .catch(() => undefined);
  }, [session?.userId, selectedFriend?.conversationId]);

  useEffect(() => {
    if (!session || !selectedParty) return;
    void loadPartyMessages(session, selectedParty.id)
      .then(setPartyMessages)
      .catch(() => undefined);
  }, [session?.userId, selectedParty?.id]);

  const handleClaimProfile = async () => {
    if (!session) return;
    setClaiming(true);
    setSuggestedAlt('');
    try {
      const created = await ensureSocialProfile(session, claimHandle, claimDisplay);
      setProfile(created);
      setEditHandle(created.username);
      setEditDisplay(created.displayName);
      setEditBio(created.bio);
      await refreshHubData(session);
      onToast(`Welcome to TurboCraft Social, @${created.username}!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/taken|duplicate/i.test(msg)) {
        const suffix = Math.floor(10 + Math.random() * 89);
        setSuggestedAlt(`${claimHandle.replace(/^@/, '')}_${suffix}`);
      }
      onToast(msg);
    } finally {
      setClaiming(false);
    }
  };

  const onlineFriends = friends.filter((f) => getPresenceStatus(f.lastActiveAtMillis) !== 'OFFLINE');
  const offlineFriends = friends.filter((f) => getPresenceStatus(f.lastActiveAtMillis) === 'OFFLINE');

  return (
    <div
      style={{
        padding: 14,
        height: 'calc(100vh - 48px)',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Top Social Header Bar */}
      <div
        className="tcl-glass-card"
        style={{
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MessageCircle size={20} color="var(--primary)" />
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>
              TurboCraft Social Hub {profile ? `• @${profile.username}` : ''}
            </div>
            <div style={{ fontSize: 11.5, opacity: 0.68 }}>
              Cross-Platform Network — Chat & Party with Android + PC Edition Players
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {profile && (
            <>
              {(
                [
                  { id: 'friends', label: `Friends (${friends.length})`, icon: <MessageCircle size={14} /> },
                  { id: 'parties', label: `My Parties (${myParties.length})`, icon: <Users size={14} /> },
                  { id: 'discover', label: `Discover (${publicParties.length})`, icon: <Compass size={14} /> },
                  {
                    id: 'requests',
                    label: `Requests (${requests.length + partyInvites.length})`,
                    icon: <UserPlus size={14} />,
                  },
                  { id: 'profile', label: 'Profile & Recovery', icon: <KeyRound size={14} /> },
                ] as const
              ).map((tItem) => (
                <button
                  key={tItem.id}
                  type="button"
                  className={tab === tItem.id ? 'tcl-btn tcl-btn-primary' : 'tcl-btn'}
                  onClick={() => setTab(tItem.id)}
                >
                  {tItem.icon} {tItem.label}
                </button>
              ))}
            </>
          )}

          <button
            type="button"
            className="tcl-btn"
            onClick={() => void connectSocial(true)}
            title="Reconnect Social Session"
          >
            <RefreshCw size={14} /> Reconnect
          </button>

          <button
            type="button"
            className="tcl-btn"
            onClick={async () => {
              if (session) {
                const check = await runSocialSelfCheck(session).catch((e) => String(e));
                setConnLog((prev) => `${prev}\n\nSelf-Check RPC:\n${check}`);
              }
              setShowConnDetails((v) => !v);
            }}
          >
            <Terminal size={14} /> Connection Details
          </button>
        </div>
      </div>

      {/* Optional Copyable Connection Details Panel (Exact v1.4/v1.5 feature!) */}
      {showConnDetails && (
        <div
          className="tcl-glass-card"
          style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}
        >
          <pre style={{ margin: 0, fontSize: 11, whiteSpace: 'pre-wrap', opacity: 0.85, flex: 1 }}>
            {connLog}
          </pre>
          <button
            type="button"
            className="tcl-btn"
            onClick={() => {
              void navigator.clipboard.writeText(connLog);
              onToast('Copied Connection Details!');
            }}
          >
            <Copy size={13} /> Copy
          </button>
        </div>
      )}

      {bootstrapping ? (
        <div className="tcl-glass-card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RefreshCw size={22} className="tcl-spin" style={{ marginRight: 10 }} /> Authenticating launcher identity with Supabase Social...
        </div>
      ) : !profile ? (
        /* CLAIM @HANDLE OR RECOVER ACCOUNT SCREEN */
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="tcl-glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 19 }}>Claim Your Social @handle</h3>
            <p style={{ margin: 0, fontSize: 13, opacity: 0.75 }}>
              Linked to active launcher account <strong>{activeAccount?.username}</strong>. Friends on TurboCraft Mobile & PC can find you by this handle!
            </p>
            <div>
              <label style={{ fontSize: 12, opacity: 0.75 }}>Unique @handle</label>
              <input
                className="tcl-input"
                value={claimHandle}
                onChange={(e) => setClaimHandle(e.target.value)}
                placeholder="wolf_pc"
                style={{ width: '100%', marginTop: 4 }}
              />
            </div>
            {suggestedAlt && (
              <button
                type="button"
                className="tcl-btn"
                onClick={() => setClaimHandle(suggestedAlt)}
                style={{ alignSelf: 'flex-start', color: 'var(--primary)' }}
              >
                Handle taken — try @{suggestedAlt}
              </button>
            )}
            <div>
              <label style={{ fontSize: 12, opacity: 0.75 }}>Display Name</label>
              <input
                className="tcl-input"
                value={claimDisplay}
                onChange={(e) => setClaimDisplay(e.target.value)}
                style={{ width: '100%', marginTop: 4 }}
              />
            </div>
            <button
              type="button"
              disabled={claiming}
              className="tcl-btn tcl-btn-primary"
              onClick={handleClaimProfile}
              style={{ marginTop: 6, justifyContent: 'center', padding: '11px 18px' }}
            >
              {claiming ? 'Creating Profile...' : 'Create My Profile'}
            </button>
          </div>

          <div className="tcl-glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 19 }}>Restore Existing Social Profile</h3>
            <p style={{ margin: 0, fontSize: 13, opacity: 0.75 }}>
              Already created a Chat Profile on TurboCraft Android or another PC? Enter your @handle and saved Recovery Code to link your friends & history here!
            </p>
            <input
              className="tcl-input"
              placeholder="Existing @handle"
              value={recoverHandle}
              onChange={(e) => setRecoverHandle(e.target.value)}
            />
            <input
              type="password"
              className="tcl-input"
              placeholder="Recovery Code"
              value={recoverCode}
              onChange={(e) => setRecoverCode(e.target.value)}
            />
            <button
              type="button"
              className="tcl-btn"
              style={{ justifyContent: 'center' }}
              onClick={async () => {
                if (!activeAccount) return;
                try {
                  const recovered = await recoverSocialAccount(activeAccount, recoverHandle, recoverCode);
                  setSession(recovered);
                  const prof = await getOwnSocialProfile(recovered);
                  setProfile(prof);
                  if (prof) await refreshHubData(recovered);
                  onToast('Recovered your Social ID & friend list!');
                } catch (err) {
                  onToast(err instanceof Error ? err.message : String(err));
                }
              }}
            >
              <KeyRound size={15} /> Recover Profile
            </button>
          </div>
        </div>
      ) : tab === 'friends' ? (
        /* FRIENDS + DIRECT MESSAGES */
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '300px 1fr', gap: 14, minHeight: 0 }}>
          <div className="tcl-glass-card" style={{ padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.65 }}>
              ONLINE — {onlineFriends.length}
            </div>
            {onlineFriends.map((f) => (
              <FriendRow
                key={f.userId}
                friend={f}
                selected={selectedFriend?.userId === f.userId}
                onClick={() => setSelectedFriend(f)}
              />
            ))}

            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.65, marginTop: 6 }}>
              OFFLINE — {offlineFriends.length}
            </div>
            {offlineFriends.map((f) => (
              <FriendRow
                key={f.userId}
                friend={f}
                selected={selectedFriend?.userId === f.userId}
                onClick={() => setSelectedFriend(f)}
              />
            ))}

            {friends.length === 0 && (
              <div style={{ fontSize: 12.5, opacity: 0.65, padding: '14px 4px' }}>
                No friends added yet. Open <strong>Requests</strong> tab to add friends by @handle!
              </div>
            )}
          </div>

          <div className="tcl-glass-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
            {selectedFriend ? (
              <>
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>
                    {selectedFriend.displayName} <span style={{ opacity: 0.6, fontWeight: 500 }}>@{selectedFriend.username}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--primary)' }}>
                    {formatLastSeen(selectedFriend.lastActiveAtMillis)}
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {dmMessages.map((m) => {
                    const mine = m.senderId === session?.userId;
                    return (
                      <div
                        key={m.id}
                        style={{
                          alignSelf: mine ? 'flex-end' : 'flex-start',
                          maxWidth: '72%',
                          padding: '9px 13px',
                          borderRadius: 14,
                          background: mine ? 'var(--primary-container)' : 'rgba(255,255,255,0.07)',
                          color: mine ? 'var(--on-primary-container)' : 'var(--on-surface)',
                        }}
                      >
                        <div style={{ fontSize: 13 }}>{m.body}</div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, fontSize: 10, opacity: 0.65 }}>
                          <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {m.editedAt && <span>(edited)</span>}
                          {mine && (
                            <>
                              <button
                                type="button"
                                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
                                onClick={() => {
                                  setEditingMsgId(m.id);
                                  setDmInput(m.body);
                                }}
                              >
                                <Edit3 size={11} />
                              </button>
                              <button
                                type="button"
                                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
                                onClick={async () => {
                                  if (!session) return;
                                  await deleteDirectMessage(session, m.id, selectedFriend.conversationId);
                                  setDmMessages((prev) => prev.filter((x) => x.id !== m.id));
                                }}
                              >
                                <Trash2 size={11} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="tcl-input"
                    placeholder={editingMsgId ? 'Edit message...' : `Message @${selectedFriend.username}...`}
                    value={dmInput}
                    onChange={(e) => setDmInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && dmInput.trim() && session) {
                        e.preventDefault();
                        void (async () => {
                          if (editingMsgId) {
                            await editDirectMessage(session, editingMsgId, selectedFriend.conversationId, dmInput);
                            setEditingMsgId(null);
                            setDmInput('');
                            setDmMessages(await loadDirectMessages(session, selectedFriend.conversationId));
                          } else {
                            const sent = await sendDirectMessage(session, selectedFriend.conversationId, dmInput);
                            setDmInput('');
                            setDmMessages((prev) => [...prev, sent]);
                          }
                        })();
                      }
                    }}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="tcl-btn tcl-btn-primary"
                    onClick={async () => {
                      if (!dmInput.trim() || !session) return;
                      if (editingMsgId) {
                        await editDirectMessage(session, editingMsgId, selectedFriend.conversationId, dmInput);
                        setEditingMsgId(null);
                        setDmInput('');
                        setDmMessages(await loadDirectMessages(session, selectedFriend.conversationId));
                      } else {
                        const sent = await sendDirectMessage(session, selectedFriend.conversationId, dmInput);
                        setDmInput('');
                        setDmMessages((prev) => [...prev, sent]);
                      }
                    }}
                  >
                    <Send size={15} />
                  </button>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.65 }}>
                Select a friend on the left to start chatting across PC & Mobile.
              </div>
            )}
          </div>
        </div>
      ) : tab === 'parties' ? (
        /* PARTIES & PARTY CHAT */
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '320px 1fr', gap: 14, minHeight: 0 }}>
          <div className="tcl-glass-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
            <button
              type="button"
              className="tcl-btn tcl-btn-primary"
              style={{ justifyContent: 'center' }}
              onClick={() => setShowCreateParty(true)}
            >
              <Plus size={15} /> Host a New Party
            </button>

            <div style={{ display: 'flex', gap: 6 }}>
              <input
                className="tcl-input"
                placeholder="6-char Invite Code"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="tcl-btn"
                onClick={async () => {
                  if (!session || !joinCodeInput.trim()) return;
                  try {
                    await joinSocialPartyByCode(session, joinCodeInput);
                    setJoinCodeInput('');
                    await refreshHubData(session);
                    onToast('Joined party!');
                  } catch (err) {
                    onToast(err instanceof Error ? err.message : String(err));
                  }
                }}
              >
                Join
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {myParties.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedParty(p)}
                  style={{
                    padding: 12,
                    borderRadius: 13,
                    background: selectedParty?.id === p.id ? 'rgba(139,229,27,0.16)' : 'rgba(255,255,255,0.04)',
                    border: selectedParty?.id === p.id ? '1.5px solid var(--primary)' : '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{p.title}</div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>
                    {p.mcVersion || 'MC'} • {p.loader || 'Vanilla'} • {p.members.length}/{p.maxMembers} players
                  </div>
                  {p.inviteCode && (
                    <div style={{ fontSize: 11, color: 'var(--primary)', marginTop: 4, fontWeight: 700 }}>
                      Code: {p.inviteCode}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="tcl-glass-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
            {selectedParty ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{selectedParty.title}</div>
                    <div style={{ fontSize: 11.5, opacity: 0.72 }}>
                      {selectedParty.mcVersion} • {selectedParty.loader} {selectedParty.serverAddress ? `• Server: ${selectedParty.serverAddress}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {selectedParty.inviteCode && (
                      <button
                        type="button"
                        className="tcl-btn"
                        onClick={() => {
                          void navigator.clipboard.writeText(selectedParty.inviteCode);
                          onToast(`Copied invite code ${selectedParty.inviteCode}!`);
                        }}
                      >
                        <Copy size={13} /> Code: {selectedParty.inviteCode}
                      </button>
                    )}
                    {selectedParty.hostId === session?.userId ? (
                      <>
                        <button
                          type="button"
                          className="tcl-btn"
                          onClick={async () => {
                            if (!session) return;
                            await extendSocialParty(session, selectedParty.id);
                            await refreshHubData(session);
                            onToast('Extended party by +1 hour!');
                          }}
                        >
                          +1h
                        </button>
                        <button
                          type="button"
                          className="tcl-btn"
                          style={{ color: '#FCA5A5' }}
                          onClick={async () => {
                            if (!session) return;
                            await endSocialParty(session, selectedParty.id);
                            setSelectedParty(null);
                            await refreshHubData(session);
                            onToast('Party ended');
                          }}
                        >
                          End Party
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="tcl-btn"
                        onClick={async () => {
                          if (!session) return;
                          await leaveSocialParty(session, selectedParty.id);
                          setSelectedParty(null);
                          await refreshHubData(session);
                        }}
                      >
                        Leave
                      </button>
                    )}
                  </div>
                </div>

                {/* Members Strip + Invite */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {selectedParty.members.map((mem) => (
                    <span
                      key={mem.userId}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        borderRadius: 999,
                        fontSize: 11.5,
                        background: 'rgba(255,255,255,0.07)',
                      }}
                    >
                      @{mem.username} {mem.isHost ? '👑' : ''}
                      {selectedParty.hostId === session?.userId && mem.userId !== session?.userId && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!session) return;
                            await kickMemberFromParty(session, selectedParty.id, mem.userId);
                            await refreshHubData(session);
                          }}
                          style={{ border: 'none', background: 'none', color: '#FCA5A5', cursor: 'pointer', padding: 0 }}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                  <input
                    className="tcl-input"
                    placeholder="Invite @friend..."
                    value={inviteHandleInput}
                    onChange={(e) => setInviteHandleInput(e.target.value)}
                    style={{ width: 145, padding: '4px 9px', fontSize: 11.5 }}
                  />
                  <button
                    type="button"
                    className="tcl-btn"
                    style={{ padding: '4px 10px', fontSize: 11.5 }}
                    onClick={async () => {
                      if (!session || !inviteHandleInput.trim()) return;
                      try {
                        await inviteFriendToParty(session, selectedParty.id, inviteHandleInput);
                        setInviteHandleInput('');
                        onToast('Party invite sent!');
                      } catch (err) {
                        onToast(err instanceof Error ? err.message : String(err));
                      }
                    }}
                  >
                    Invite
                  </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {partyMessages.map((pm) => (
                    <div
                      key={pm.id}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 12,
                        background: 'rgba(255,255,255,0.05)',
                      }}
                    >
                      <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--primary)' }}>
                        {pm.senderName} (@{pm.senderUsername}):{' '}
                      </span>
                      <span style={{ fontSize: 13 }}>{pm.body}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="tcl-input"
                    placeholder="Send message to party..."
                    value={partyChatInput}
                    onChange={(e) => setPartyChatInput(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="tcl-btn tcl-btn-primary"
                    onClick={async () => {
                      if (!session || !partyChatInput.trim()) return;
                      const msg = await sendPartyChatMessage(session, selectedParty.id, partyChatInput);
                      setPartyChatInput('');
                      setPartyMessages((prev) => [...prev, msg]);
                    }}
                  >
                    <Send size={15} />
                  </button>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.65 }}>
                Host a party on any installed PC instance or join with a 6-character code!
              </div>
            )}
          </div>
        </div>
      ) : tab === 'discover' ? (
        /* DISCOVER PUBLIC PARTIES */
        <div className="tcl-glass-card" style={{ flex: 1, padding: 18, overflowY: 'auto' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 17 }}>Public Parties Across TurboCraft</h3>
          {publicParties.length === 0 ? (
            <div style={{ opacity: 0.65, fontSize: 13 }}>
              No public parties live right now — click <strong>My Parties → Host a New Party</strong> and toggle Public to start one!
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 12 }}>
              {publicParties.map((pub) => (
                <div
                  key={pub.id}
                  style={{
                    padding: 14,
                    borderRadius: 15,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 14.5 }}>{pub.title}</div>
                  <div style={{ fontSize: 12, opacity: 0.72 }}>
                    {pub.mcVersion || 'Minecraft'} • {pub.loader || 'Vanilla'} • {pub.members.length}/{pub.maxMembers} players
                  </div>
                  <button
                    type="button"
                    className="tcl-btn tcl-btn-primary"
                    style={{ justifyContent: 'center' }}
                    onClick={async () => {
                      if (!session) return;
                      await joinPublicParty(session, pub.id);
                      await refreshHubData(session);
                      setTab('parties');
                      onToast(`Joined "${pub.title}"!`);
                    }}
                  >
                    Join Party
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : tab === 'requests' ? (
        /* FRIEND REQUESTS & PARTY INVITES */
        <div className="tcl-glass-card" style={{ flex: 1, padding: 18, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <h4 style={{ margin: '0 0 8px' }}>Add Friend by @handle</h4>
            <div style={{ display: 'flex', gap: 8, maxWidth: 460 }}>
              <input
                className="tcl-input"
                placeholder="Enter friend's @handle..."
                value={addFriendInput}
                onChange={(e) => setAddFriendInput(e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="tcl-btn tcl-btn-primary"
                onClick={async () => {
                  if (!session || !addFriendInput.trim()) return;
                  try {
                    await sendFriendRequestByHandle(session, addFriendInput);
                    setAddFriendInput('');
                    onToast('Friend request sent!');
                  } catch (err) {
                    onToast(err instanceof Error ? err.message : String(err));
                  }
                }}
              >
                Send Request
              </button>
            </div>
          </div>

          <div>
            <h4 style={{ margin: '0 0 8px' }}>Incoming Friend Requests ({requests.length})</h4>
            {requests.map((req) => (
              <div
                key={req.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.05)',
                  marginBottom: 6,
                }}
              >
                <div>
                  <strong>{req.displayName}</strong> <span style={{ opacity: 0.65 }}>@{req.username}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className="tcl-btn tcl-btn-primary"
                    onClick={async () => {
                      if (!session) return;
                      await respondFriendRequest(session, req.id, true);
                      await refreshHubData(session);
                      onToast(`Accepted @${req.username}!`);
                    }}
                  >
                    <Check size={14} /> Accept
                  </button>
                  <button
                    type="button"
                    className="tcl-btn"
                    onClick={async () => {
                      if (!session) return;
                      await respondFriendRequest(session, req.id, false);
                      await refreshHubData(session);
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div>
            <h4 style={{ margin: '0 0 8px' }}>Party Invites ({partyInvites.length})</h4>
            {partyInvites.map((inv) => (
              <div
                key={inv.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.05)',
                  marginBottom: 6,
                }}
              >
                <div>
                  <strong>{inv.partyTitle}</strong> — invited by @{inv.fromUsername}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className="tcl-btn tcl-btn-primary"
                    onClick={async () => {
                      if (!session) return;
                      await respondPartyInvite(session, inv.id, true);
                      await refreshHubData(session);
                      setTab('parties');
                    }}
                  >
                    Join
                  </button>
                  <button
                    type="button"
                    className="tcl-btn"
                    onClick={async () => {
                      if (!session) return;
                      await respondPartyInvite(session, inv.id, false);
                      await refreshHubData(session);
                    }}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* PROFILE & RECOVERY CODE MANAGEMENT */
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="tcl-glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h3 style={{ margin: 0, fontSize: 17 }}>Edit Social Profile</h3>
            <label style={{ fontSize: 12, opacity: 0.75 }}>@handle</label>
            <input className="tcl-input" value={editHandle} onChange={(e) => setEditHandle(e.target.value)} />
            <label style={{ fontSize: 12, opacity: 0.75 }}>Display Name</label>
            <input className="tcl-input" value={editDisplay} onChange={(e) => setEditDisplay(e.target.value)} />
            <label style={{ fontSize: 12, opacity: 0.75 }}>Bio</label>
            <textarea
              className="tcl-input"
              rows={3}
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
            />
            <button
              type="button"
              className="tcl-btn tcl-btn-primary"
              style={{ alignSelf: 'flex-start' }}
              onClick={async () => {
                if (!session) return;
                try {
                  const updated = await updateSocialProfile(session, editHandle, editDisplay, editBio);
                  setProfile(updated);
                  onToast('Profile updated!');
                } catch (err) {
                  onToast(err instanceof Error ? err.message : String(err));
                }
              }}
            >
              Save Profile
            </button>
          </div>

          <div className="tcl-glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h3 style={{ margin: 0, fontSize: 17 }}>Recovery Code Backup</h3>
            <p style={{ margin: 0, fontSize: 12.5, opacity: 0.75 }}>
              Set a secret Recovery Code so you can link this same @handle, friend list, and messages on your Android phone or after reinstalling Windows/Linux!
            </p>
            <input
              type="password"
              className="tcl-input"
              placeholder="Choose a strong recovery passphrase..."
              value={newRecoveryCode}
              onChange={(e) => setNewRecoveryCode(e.target.value)}
            />
            <button
              type="button"
              className="tcl-btn tcl-btn-primary"
              style={{ alignSelf: 'flex-start' }}
              onClick={async () => {
                if (!session || newRecoveryCode.trim().length < 6) {
                  onToast('Recovery code must be at least 6 characters.');
                  return;
                }
                await setSocialRecoveryCode(session, newRecoveryCode);
                setNewRecoveryCode('');
                onToast('Recovery code saved securely!');
              }}
            >
              <KeyRound size={14} /> Save Recovery Code
            </button>
          </div>
        </div>
      )}

      {/* Host Party Modal */}
      {showCreateParty && session && (
        <div className="tcl-modal-backdrop" onClick={() => setShowCreateParty(false)}>
          <div
            className="tcl-glass-card"
            style={{ width: 'min(480px, 92vw)', padding: 22, display: 'flex', flexDirection: 'column', gap: 10 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0 }}>Host a Party</h3>
            <input
              className="tcl-input"
              placeholder="Party Title (e.g. Survival Modded Run)"
              value={partyTitle}
              onChange={(e) => setPartyTitle(e.target.value)}
            />
            <select
              className="tcl-input"
              value={partyInstId}
              onChange={(e) => setPartyInstId(e.target.value)}
            >
              {state.instances.map((i) => (
                <option key={i.id} value={i.id}>
                  Instance: {i.name} ({i.mcVersion})
                </option>
              ))}
            </select>
            <input
              className="tcl-input"
              placeholder="Optional Server IP / Terracotta Room Code"
              value={partyServerIp}
              onChange={(e) => setPartyServerIp(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
              <span>Max Members: {partyMaxMembers}</span>
              <input
                type="range"
                min={2}
                max={16}
                value={partyMaxMembers}
                onChange={(e) => setPartyMaxMembers(Number(e.target.value))}
              />
            </div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={partyPublic}
                onChange={(e) => setPartyPublic(e.target.checked)}
              />
              Make Party discoverable in Public Parties tab
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button type="button" className="tcl-btn" onClick={() => setShowCreateParty(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="tcl-btn tcl-btn-primary"
                onClick={async () => {
                  const inst = state.instances.find((i) => i.id === partyInstId);
                  await createSocialParty(session, {
                    title: partyTitle.trim() || `${profile?.displayName}'s Party`,
                    versionId: inst?.id,
                    instanceName: inst?.name,
                    mcVersion: inst?.mcVersion,
                    loader: inst?.loader,
                    serverAddress: partyServerIp,
                    maxMembers: partyMaxMembers,
                    isPublic: partyPublic,
                  });
                  setShowCreateParty(false);
                  await refreshHubData(session);
                  onToast('Party created!');
                }}
              >
                Create Party
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FriendRow: React.FC<{
  friend: ChatFriend;
  selected: boolean;
  onClick: () => void;
}> = ({ friend, selected, onClick }) => {
  const status = getPresenceStatus(friend.lastActiveAtMillis);
  const dotColor =
    status === 'ONLINE' ? '#8BE51B' : status === 'IDLE' ? '#FBBF24' : 'rgba(255,255,255,0.28)';

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 11px',
        borderRadius: 12,
        background: selected ? 'rgba(139,229,27,0.15)' : 'rgba(255,255,255,0.03)',
        cursor: 'pointer',
      }}
    >
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: '50%',
          background: dotColor,
          boxShadow: status === 'ONLINE' ? '0 0 8px #8BE51B' : 'none',
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{friend.displayName}</div>
        <div style={{ fontSize: 11, opacity: 0.65 }}>
          @{friend.username} • {formatLastSeen(friend.lastActiveAtMillis)}
        </div>
      </div>
    </div>
  );
};
