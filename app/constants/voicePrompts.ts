/**
 * Voice Prompts
 *
 * Centralized TTS prompt strings for all voice feedback.
 * Makes it easy to modify wording or add i18n support later.
 */

export const VoicePrompts = {
  // ─── General ─────────────────────────────────────────
  welcome: 'Welcome to VoiceMail Assist. Say Hey VoiceMail at any time to activate voice commands.',
  homeInstructions: 'You can say: compose email, read inbox, or logout. Say go to sleep to enter standby mode.',
  unknownCommand: "I didn't understand that. Please try again.",
  networkError: 'A network error occurred. Please try again later.',
  goingBack: 'Going back.',
  goodbye: 'Goodbye. Logging out.',

  // ─── Authentication ──────────────────────────────────
  loginPrompt: 'Please enter your email and password to log in, or say your email address.',
  loginSuccess: 'Login successful. Welcome!',
  loginFailed: 'Login failed. Please check your credentials and try again.',
  signupSuccess: 'Account created successfully. You are now logged in.',
  signupFailed: 'Account creation failed. This email may already be registered.',
  speakEmail: 'Say your email address.',
  speakPassword: 'Say your password.',
  confirmEmail: (email: string) => `Did you say ${email}? Say yes or no.`,

  // ─── Compose Flow ────────────────────────────────────
  composeStart: 'Compose email. Who do you want to send the email to?',
  askRecipient: 'Who do you want to send the email to? Say their email address.',
  confirmRecipient: (email: string) =>
    `Did you say ${email}? Say yes to confirm or no to try again.`,
  askSubject: 'What is the subject of your email?',
  confirmSubject: (subject: string) =>
    `The subject is: ${subject}. Say yes to confirm or no to try again.`,
  askMessage: 'Now speak your message.',
  confirmMessage: (message: string) =>
    `Your message is: ${message}. Say send to send the email, or repeat to hear it again, or start over to begin again.`,
  sending: 'Sending your email...',
  sendSuccess: 'Email sent successfully!',
  sendFailed: 'Failed to send email. Please try again.',

  // ─── Inbox ───────────────────────────────────────────
  inboxLoading: 'Loading your inbox...',
  inboxEmpty: 'Your inbox is empty. No emails found.',
  inboxCount: (count: number) =>
    `You have ${count} ${count === 1 ? 'email' : 'emails'}.`,
  emailSummary: (index: number, sender: string, subject: string) =>
    `Email ${index}: From ${sender}. Subject: ${subject}.`,
  inboxInstructions:
    'Say next for the next email, previous for the previous one, open to read this email, or go back.',
  noMoreEmails: 'No more emails.',
  noPreviousEmails: 'You are at the first email.',

  // ─── Read Email ──────────────────────────────────────
  readingEmail: (sender: string, subject: string, message: string) =>
    `From ${sender}. Subject: ${subject}. Message: ${message}`,
  readInstructions: 'Say repeat to hear the email again, delete to delete it, or go back.',
  deleteConfirm: 'Are you sure you want to delete this email? Say yes or no.',
  deleteSuccess: 'Email deleted.',
  deleteFailed: 'Failed to delete email.',

  // ─── Error Recovery ──────────────────────────────────
  pleaseRepeat: "I didn't catch that. Please say your command again.",
  noEmails: 'No emails found.',
  tryAgain: 'Something went wrong. Please try again.',
  micPermissionDenied: 'Microphone permission is required for voice commands. Please enable it in your device settings.',

  // ─── Hands-Free Mode ──────────────────────────────────
  handsFreeActivated: "I'm listening. What would you like to do?",
  handsFreeDeactivated: 'Going to sleep. Say Hey VoiceMail to wake me up.',
} as const;
