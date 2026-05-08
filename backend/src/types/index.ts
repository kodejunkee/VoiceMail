/**
 * TypeScript interfaces for VoiceMail Assist backend
 */

// Represents an email record in Supabase
export interface Email {
  id: string;
  user_id: string;
  sender: string;
  recipient: string;
  subject: string;
  message: string;
  is_read: boolean;
  email_type: 'sent' | 'received';
  created_at: string;
}

// Request body for sending an email
export interface SendEmailRequest {
  recipient: string;
  subject: string;
  message: string;
}

// Authenticated request — carries user info from middleware
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}
