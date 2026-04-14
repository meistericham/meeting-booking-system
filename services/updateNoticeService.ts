import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export type UpdateNoticeAudience = 'user' | 'admin' | 'super_admin';

export interface UpdateNoticeEntry {
  enabled: boolean;
  version: string;
  title: string;
  intro: string;
  bullets: string[];
}

export interface UpdateNoticeConfig {
  notices: Record<UpdateNoticeAudience, UpdateNoticeEntry>;
  updatedAt?: any;
}

const DOC_PATH = ['app_settings', 'update_notice'] as const;

const DEFAULT_ENTRY: UpdateNoticeEntry = {
  enabled: true,
  version: '2026-03-26',
  title: 'What’s New in e-RUAI',
  intro: 'Please review these latest updates:',
  bullets: ['Auto Combine Room', 'Mobile UI Refresh', 'Latest User Guide overhaul'],
};

export const DEFAULT_UPDATE_NOTICE: UpdateNoticeConfig = {
  notices: {
    user: { ...DEFAULT_ENTRY },
    admin: { ...DEFAULT_ENTRY, enabled: false },
    super_admin: { ...DEFAULT_ENTRY },
  },
};

const normalizeEntry = (raw: any, fallback: UpdateNoticeEntry): UpdateNoticeEntry => ({
  enabled: raw?.enabled ?? fallback.enabled,
  version: raw?.version || fallback.version,
  title: raw?.title || fallback.title,
  intro: raw?.intro || fallback.intro,
  bullets: Array.isArray(raw?.bullets) && raw.bullets.length > 0 ? raw.bullets.map(String) : fallback.bullets,
});

export const getUpdateNoticeConfig = async (): Promise<UpdateNoticeConfig> => {
  const ref = doc(db, DOC_PATH[0], DOC_PATH[1]);
  const snap = await getDoc(ref);

  if (!snap.exists()) return DEFAULT_UPDATE_NOTICE;

  const data = snap.data() as any;

  // Backward compatibility: old single-target schema
  if (!data.notices) {
    const entry = normalizeEntry(data, DEFAULT_UPDATE_NOTICE.notices.super_admin);
    const target = (data.target as UpdateNoticeAudience) || 'super_admin';
    return {
      notices: {
        ...DEFAULT_UPDATE_NOTICE.notices,
        [target]: entry,
      },
      updatedAt: data.updatedAt,
    };
  }

  return {
    notices: {
      user: normalizeEntry(data.notices.user, DEFAULT_UPDATE_NOTICE.notices.user),
      admin: normalizeEntry(data.notices.admin, DEFAULT_UPDATE_NOTICE.notices.admin),
      super_admin: normalizeEntry(data.notices.super_admin, DEFAULT_UPDATE_NOTICE.notices.super_admin),
    },
    updatedAt: data.updatedAt,
  };
};

export const saveUpdateNoticeConfig = async (config: UpdateNoticeConfig) => {
  const ref = doc(db, DOC_PATH[0], DOC_PATH[1]);

  const clean = (e: UpdateNoticeEntry): UpdateNoticeEntry => ({
    ...e,
    bullets: e.bullets.filter(Boolean),
  });

  await setDoc(
    ref,
    {
      notices: {
        user: clean(config.notices.user),
        admin: clean(config.notices.admin),
        super_admin: clean(config.notices.super_admin),
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};
