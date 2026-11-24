import React, { useEffect, useState } from 'react';
import { marked } from 'marked';
import { ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';

export const LEGAL_VERSION = '2026/11/04';

interface AgreementModalProps {
  onAccept: () => void;
}

export const AgreementModal: React.FC<AgreementModalProps> = ({ onAccept }) => {
  const [activeDoc, setActiveDoc] = useState<'agreement' | 'privacy'>('agreement');
  const [agreementMd, setAgreementMd] = useState('');
  const [privacyMd, setPrivacyMd] = useState('');

  useEffect(() => {
    void fetch('./assets/legal/user_agreement.md')
      .then((r) => r.text())
      .then(setAgreementMd)
      .catch(() => setAgreementMd('# TurboCraft Launcher User Agreement'));
    void fetch('./assets/legal/privacy_policy.md')
      .then((r) => r.text())
      .then(setPrivacyMd)
      .catch(() => setPrivacyMd('# TurboCraft Launcher Privacy Policy'));
  }, []);

  const html = marked.parse(activeDoc === 'agreement' ? agreementMd : privacyMd) as string;

  return (
    <div className="tcl-modal-backdrop" style={{ zIndex: 110 }}>
      <div className="tcl-glass-card" style={{ width: 'min(780px, 94vw)', maxHeight: '86vh', display: 'flex', flexDirection: 'column', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <img src="./assets/turbocraft-icon.png" alt="" style={{ width: 42, height: 42, borderRadius: 12 }} />
          <div>
            <h2 style={{ margin: 0, fontSize: 19 }}>TurboCraft Launcher — User Agreement & Privacy Policy</h2>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Effective Version {LEGAL_VERSION} • GPL-3.0 Open Source • PC & Android Ecosystem
            </div>
          </div>
        </div>

        {/* Hindi + English Summary Banner (just like Mobile v1.4!) */}
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 14,
            background: 'rgba(139, 229, 27, 0.11)',
            border: '1px solid rgba(139, 229, 27, 0.3)',
            fontSize: 12.5,
            lineHeight: 1.5,
            marginBottom: 12,
          }}
        >
          <strong>संक्षिप्त सार (Hindi Summary):</strong> TurboCraft Launcher में कोई विज्ञापन या ट्रैकिंग SDK नहीं है। आपके गेम फ़ाइलें, मॉड्स और अकाउंट्स आपके PC पर सुरक्षित रहते हैं। केवल Social Hub (दोस्त, चैट और पार्टी) का उपयोग करने पर आपका प्रोफ़ाइल हमारे सुरक्षित Supabase सर्वर से जुड़ता है। ऑनलाइन खेलने के लिए वैध Minecraft: Java Edition अकाउंट आवश्यक है।
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            type="button"
            className={activeDoc === 'agreement' ? 'tcl-btn tcl-btn-primary' : 'tcl-btn'}
            onClick={() => setActiveDoc('agreement')}
          >
            <FileText size={15} /> User Agreement
          </button>
          <button
            type="button"
            className={activeDoc === 'privacy' ? 'tcl-btn tcl-btn-primary' : 'tcl-btn'}
            onClick={() => setActiveDoc('privacy')}
          >
            <ShieldCheck size={15} /> Privacy Policy
          </button>
        </div>

        <div
          className="tcl-markdown-body"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 18px',
            borderRadius: 14,
            background: 'rgba(0,0,0,0.28)',
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: 13,
            lineHeight: 1.6,
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, gap: 12 }}>
          <span style={{ fontSize: 11.5, opacity: 0.65 }}>
            Derived from open-source community work (PojavLauncher, Zalith Launcher 2, HMCL • GNU GPL v3.0).
          </span>
          <button type="button" className="tcl-btn tcl-btn-primary" onClick={onAccept} style={{ padding: '10px 22px' }}>
            <CheckCircle2 size={16} /> I Agree & Continue
          </button>
        </div>
      </div>
    </div>
  );
};
