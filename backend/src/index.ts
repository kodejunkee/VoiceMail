/**
 * VoiceMail Assist — Backend Server Entry Point
 *
 * Express server that provides REST API for:
 * - Sending emails via Gmail SMTP (Nodemailer)
 * - Storing/retrieving emails from Supabase
 * - User authentication verification
 */

// Load environment variables FIRST — before any module reads process.env
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import emailRoutes from './routes/email';

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Routes ──────────────────────────────────────────────────────────
app.use('/api', emailRoutes);

// ─── Health Check ────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'VoiceMail Assist API is running' });
});

// ─── Start Server ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 VoiceMail Assist backend running on http://10.41.239.13:${PORT}`);
});
