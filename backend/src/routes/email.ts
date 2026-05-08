/**
 * Email Routes
 *
 * REST endpoints for email operations:
 * POST /api/send-email   - Send an email via SMTP + store in Supabase
 * GET  /api/emails        - Fetch all emails for the authenticated user
 * GET  /api/emails/:id    - Fetch a single email by ID
 * DELETE /api/emails/:id  - Delete an email
 * PATCH /api/emails/:id/read - Mark an email as read
 */

import { Router, Response } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { supabaseAdmin } from '../services/supabase';
import { sendEmail } from '../services/mailer';
import { AuthenticatedRequest, SendEmailRequest } from '../types';

const router = Router();

// All routes require authentication
router.use(authMiddleware as any);

// ─── POST /api/send-email ────────────────────────────────────────────
// Sends an email via Gmail SMTP and stores it in Supabase
router.post('/send-email', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { recipient, subject, message } = req.body as SendEmailRequest;
    const userId = req.user!.id;
    const senderEmail = req.user!.email;

    // Validate required fields
    if (!recipient || !message) {
      res.status(400).json({ error: 'Recipient and message are required' });
      return;
    }

    // Send the actual email via SMTP
    const emailResult = await sendEmail(
      recipient,
      subject || '(No Subject)',
      message,
      senderEmail
    );

    // Store the sent email in Supabase
    const { data, error } = await supabaseAdmin
      .from('emails')
      .insert({
        user_id: userId,
        sender: senderEmail,
        recipient,
        subject: subject || '(No Subject)',
        message,
        email_type: 'sent',
        is_read: true, // Sent emails are "read" by default
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error.message);
      // Email was sent but storage failed — still report success
      res.status(200).json({
        success: true,
        message: 'Email sent but storage failed',
        messageId: emailResult.messageId,
      });
      return;
    }

    // Also create a "received" copy so it appears in recipient's inbox
    // (For demo: only works if recipient is also a VoiceMail user)
    const { data: recipientUser } = await supabaseAdmin.auth.admin.listUsers();
    const recipientAccount = recipientUser?.users?.find(
      (u) => u.email === recipient
    );

    if (recipientAccount) {
      await supabaseAdmin.from('emails').insert({
        user_id: recipientAccount.id,
        sender: senderEmail,
        recipient,
        subject: subject || '(No Subject)',
        message,
        email_type: 'received',
        is_read: false,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Email sent successfully',
      email: data,
      messageId: emailResult.messageId,
    });
  } catch (err: any) {
    console.error('Send email error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to send email' });
  }
});

// ─── GET /api/emails ─────────────────────────────────────────────────
// Fetch all emails for the authenticated user, ordered by newest first
router.get('/emails', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const emailType = req.query.type as string | undefined;

    let query = supabaseAdmin
      .from('emails')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Optional filter by type (sent/received)
    if (emailType && (emailType === 'sent' || emailType === 'received')) {
      query = query.eq('email_type', emailType);
    }

    const { data, error } = await query;

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ emails: data || [], count: data?.length || 0 });
  } catch (err: any) {
    console.error('Fetch emails error:', err.message);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

// ─── GET /api/emails/:id ────────────────────────────────────────────
// Fetch a single email by ID
router.get('/emails/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const emailId = req.params.id;

    const { data, error } = await supabaseAdmin
      .from('emails')
      .select('*')
      .eq('id', emailId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Email not found' });
      return;
    }

    // Mark as read when opened
    if (!data.is_read) {
      await supabaseAdmin
        .from('emails')
        .update({ is_read: true })
        .eq('id', emailId)
        .eq('user_id', userId);
    }

    res.json({ email: { ...data, is_read: true } });
  } catch (err: any) {
    console.error('Fetch email error:', err.message);
    res.status(500).json({ error: 'Failed to fetch email' });
  }
});

// ─── DELETE /api/emails/:id ──────────────────────────────────────────
// Delete an email by ID
router.delete('/emails/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const emailId = req.params.id;

    const { error } = await supabaseAdmin
      .from('emails')
      .delete()
      .eq('id', emailId)
      .eq('user_id', userId);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ success: true, message: 'Email deleted' });
  } catch (err: any) {
    console.error('Delete email error:', err.message);
    res.status(500).json({ error: 'Failed to delete email' });
  }
});

// ─── PATCH /api/emails/:id/read ──────────────────────────────────────
// Mark an email as read
router.patch('/emails/:id/read', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const emailId = req.params.id;

    const { error } = await supabaseAdmin
      .from('emails')
      .update({ is_read: true })
      .eq('id', emailId)
      .eq('user_id', userId);

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ success: true, message: 'Email marked as read' });
  } catch (err: any) {
    console.error('Mark read error:', err.message);
    res.status(500).json({ error: 'Failed to mark email as read' });
  }
});

export default router;
