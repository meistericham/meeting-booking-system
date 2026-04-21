import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  buildDefaultCommunicationSettings,
  COMMUNICATION_SETTINGS_DOC_ID,
} from '../config/communications';
import { CommunicationSettings, EmailTemplate, EmailTemplateKey } from '../types';

const readString = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value.trim() : fallback;

const readNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const normalizeTemplate = (
  key: EmailTemplateKey,
  raw: unknown
): EmailTemplate => {
  const defaults = buildDefaultCommunicationSettings().templates[key];

  if (!raw || typeof raw !== 'object') {
    return defaults;
  }

  const data = raw as Record<string, unknown>;

  return {
    subject: readString(data.subject, defaults.subject),
    body: readString(data.body, defaults.body),
    updatedAt: readNumber(data.updatedAt),
    updatedBy: readString(data.updatedBy) || undefined,
  };
};

export const fetchCommunicationSettings = async (): Promise<CommunicationSettings> => {
  const settingsRef = doc(db, 'appSettings', COMMUNICATION_SETTINGS_DOC_ID);
  const snapshot = await getDoc(settingsRef);
  const defaults = buildDefaultCommunicationSettings();

  if (!snapshot.exists()) {
    return defaults;
  }

  const raw = snapshot.data();
  const templates =
    raw && typeof raw.templates === 'object' && raw.templates !== null
      ? (raw.templates as Record<string, unknown>)
      : {};

  return {
    templates: {
      invite: normalizeTemplate('invite', templates.invite),
      booking_pending: normalizeTemplate('booking_pending', templates.booking_pending),
      booking_approved: normalizeTemplate('booking_approved', templates.booking_approved),
      booking_rejected: normalizeTemplate('booking_rejected', templates.booking_rejected),
    },
  };
};

export const saveCommunicationTemplate = async (
  key: EmailTemplateKey,
  template: Pick<EmailTemplate, 'subject' | 'body'>,
  updatedBy: string
) => {
  const settingsRef = doc(db, 'appSettings', COMMUNICATION_SETTINGS_DOC_ID);
  await setDoc(
    settingsRef,
    {
      templates: {
        [key]: {
          subject: template.subject.trim(),
          body: template.body.trim(),
          updatedAt: Date.now(),
          updatedBy,
        },
      },
    },
    { merge: true }
  );
};

export const resetCommunicationTemplate = async (
  key: EmailTemplateKey,
  updatedBy: string
) => {
  const defaults = buildDefaultCommunicationSettings();
  await saveCommunicationTemplate(key, defaults.templates[key], updatedBy);
};
