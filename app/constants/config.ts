/**
 * App Configuration
 *
 * Centralized configuration for API URLs and Supabase credentials.
 * Reads from expo extra config (app.json).
 */

import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const Config = {
  // Supabase
  SUPABASE_URL: extra.SUPABASE_URL || 'https://xgfoobfohniiaokgvdgm.supabase.co',
  SUPABASE_ANON_KEY:
    extra.SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhnZm9vYmZvaG5paWFva2d2ZGdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MTc1NDMsImV4cCI6MjA5MzI5MzU0M30.YwGT-ecx9Npe0VlucfTCyxH5rLYadtqSyNXuD1ew16U',

  // Backend API
  API_URL: extra.API_URL || 'http://10.41.239.13:3001',
} as const;
