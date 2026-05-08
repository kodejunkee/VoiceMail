/**
 * API Service
 *
 * Handles all HTTP requests to the VoiceMail Assist backend.
 * Automatically attaches the Supabase auth token to requests.
 */

import { Config } from '../constants/config';

const BASE_URL = Config.API_URL;

// ─── Types ───────────────────────────────────────────────────────────
export interface EmailData {
  id: string;
  sender: string;
  recipient: string;
  subject: string;
  message: string;
  is_read: boolean;
  email_type: 'sent' | 'received';
  created_at: string;
}

export interface SendEmailPayload {
  recipient: string;
  subject: string;
  message: string;
}

// ─── Helper ──────────────────────────────────────────────────────────
async function apiRequest<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}/api${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Request failed with status ${response.status}`);
  }

  return response.json();
}

// ─── API Methods ─────────────────────────────────────────────────────

/**
 * Send an email via the backend
 */
export async function sendEmail(token: string, payload: SendEmailPayload) {
  return apiRequest<{ success: boolean; message: string; messageId?: string }>(
    '/send-email',
    token,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

/**
 * Fetch all emails for the current user
 */
export async function getEmails(
  token: string,
  type?: 'sent' | 'received'
): Promise<{ emails: EmailData[]; count: number }> {
  const query = type ? `?type=${type}` : '';
  return apiRequest(`/emails${query}`, token);
}

/**
 * Fetch a single email by ID
 */
export async function getEmail(
  token: string,
  id: string
): Promise<{ email: EmailData }> {
  return apiRequest(`/emails/${id}`, token);
}

/**
 * Delete an email by ID
 */
export async function deleteEmail(
  token: string,
  id: string
): Promise<{ success: boolean; message: string }> {
  return apiRequest(`/emails/${id}`, token, { method: 'DELETE' });
}
