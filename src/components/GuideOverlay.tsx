import React, { useState } from 'react';
import { Compass, ChevronRight, Check } from 'lucide-react';

interface GuideStep {
  title: string;
  titleHi: string;
  body: string;
  bodyHi: string;
  badge: string;
}

const STEPS: GuideStep[] = [
  {
    badge: '1 / 5 • GLASS SIDEBAR',
    title: 'Quick Sidebar & JVM Controls',
    titleHi: 'क्विक साइडबार और JVM कंट्रोल्स',
    body: 'Click the bouncy left glass bar to expand quick shortcuts: JVM RAM & GC presets, Installed Versions Manager, Launcher Info, and the TCL Team roster.',
    bodyHi: 'बाईं तरफ़ के ग्लास साइडबार पर क्लिक करके JVM RAM सेटिंग्स, इंस्टेंसेज़ मैनेजर, और हमारी TCL टीम के शॉर्टकट्स खोलें।',
  },
  {
    badge: '2 / 5 • 3D WARDROBE & ACCOUNTS',
    title: 'Interactive 3D Skin Pet & Microsoft Auth',
    titleHi: 'इंटरएक्टिव 3D स्किन और अकाउंट्स',
    body: 'Your 3D player pet tracks your mouse cursor and reacts when clicked! Sign in with Microsoft OAuth, Offline, or Yggdrasil accounts and equip custom Capes.',
    bodyHi: 'आपका 3D प्लेयर मॉडल माउस को ट्रैक करता है! Microsoft, Offline या Yggdrasil अकाउंट जोड़ें और 3D Cape पहनाएँ।',
  },
  {
    badge: '3 / 5 • DOWNLOAD HUB',
    title: 'Vanilla, Fabric, NeoForge, Forge + Modrinth Store',
    titleHi: 'गेम वर्शन और Modrinth / CurseForge स्टोर',
    body: 'Open Download in the top bar to install any Minecraft release/snapshot with Fabric, Quilt, NeoForge, or Forge, plus 1-click Mods, Modpacks, Shaders & Resource Packs.',
    bodyHi: 'ऊपर Download टैब से कोई भी Minecraft वर्शन, मॉड लोडर, Modpacks, Mods और Shaders एक क्लिक में इंस्टॉल करें।',
  },
  {
    badge: '4 / 5 • CROSS-PLATFORM SOCIAL HUB',
    title: 'Chat & Party with Mobile + PC Friends',
    titleHi: 'मोबाइल और PC दोस्तों के साथ चैट व पार्टी',
    body: 'Social Hub connects to the shared TurboCraft Supabase network — claim your @handle, add Android & PC friends, chat live, and share 6-digit Party codes!',
    bodyHi: 'Social Hub से अपना @handle बनाएँ और Android व PC दोनों खिलाड़ियों के साथ लाइव चैट और पार्टी करें!',
  },
  {
    badge: '5 / 5 • TERRACOTTA & CRASH ANALYZER',
    title: 'LAN Multiplayer & Smart Crash Diagnostics',
    titleHi: 'मल्टीप्लेयर टनल और स्मार्ट क्रैश एनालाइज़र',
    body: 'Use Terracotta to host LAN worlds with friends, and inspect live JVM logs with automatic Crash Analysis & 1-click mclo.gs sharing.',
    bodyHi: 'Terracotta से दोस्तों के साथ LAN वर्ल्ड खेलें और क्रैश आने पर Smart Crash Analyzer से तुरंत समाधान पाएँ।',
  },
];

export const GuideOverlay: React.FC<{
  language: 'en' | 'hi';
  onFinish: () => void;
}> = ({ language, onFinish }) => {
  const [stepIdx, setStepIdx] = useState(0);
  const step = STEPS[stepIdx];

  return (
    <div className="tcl-modal-backdrop" style={{ zIndex: 105 }}>
      <div className="tcl-glass-card" style={{ width: 'min(500px, 92vw)', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.8,
              color: 'var(--primary)',
            }}
          >
            <Compass size={14} /> {step.badge}
          </span>
          <button
            type="button"
            onClick={onFinish}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--on-surface-variant)',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            Skip Guide
          </button>
        </div>

        <h3 style={{ margin: '4px 0 10px', fontSize: 20 }}>
          {language === 'hi' ? step.titleHi : step.title}
        </h3>
        <p style={{ margin: '0 0 20px', fontSize: 13.5, lineHeight: 1.6, color: 'var(--on-surface-variant)' }}>
          {language === 'hi' ? step.bodyHi : step.body}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {STEPS.map((_, idx) => (
              <div
                key={idx}
                style={{
                  width: idx === stepIdx ? 22 : 7,
                  height: 7,
                  borderRadius: 999,
                  background: idx === stepIdx ? 'var(--primary)' : 'rgba(255,255,255,0.2)',
                  transition: 'all 0.22s ease',
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {stepIdx > 0 && (
              <button type="button" className="tcl-btn" onClick={() => setStepIdx((i) => i - 1)}>
                Back
              </button>
            )}
            {stepIdx < STEPS.length - 1 ? (
              <button type="button" className="tcl-btn tcl-btn-primary" onClick={() => setStepIdx((i) => i + 1)}>
                Next <ChevronRight size={15} />
              </button>
            ) : (
              <button type="button" className="tcl-btn tcl-btn-primary" onClick={onFinish}>
                <Check size={15} /> Let’s Play!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
