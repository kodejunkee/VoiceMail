/**
 * Command Parser
 *
 * Natural-language command parser that converts spoken text
 * into structured commands the app can act on.
 *
 * Uses broad synonym matching to handle the many ways
 * users might phrase the same intent — critical for
 * accessibility and hands-free operation.
 */

export type VoiceCommand =
  | { action: 'compose' }
  | { action: 'inbox' }
  | { action: 'send' }
  | { action: 'read'; index?: number }
  | { action: 'open'; index?: number }
  | { action: 'next' }
  | { action: 'previous' }
  | { action: 'repeat' }
  | { action: 'delete' }
  | { action: 'yes' }
  | { action: 'no' }
  | { action: 'back' }
  | { action: 'logout' }
  | { action: 'help' }
  | { action: 'start_over' }
  | { action: 'unknown'; raw: string };

// ─── Phrase Maps ───────────────────────────────────────────
// Each action maps to an array of trigger phrases.
// Phrases are checked via `includes()` so partial matches work.
// Order matters: more specific phrases should come first.

const COMPOSE_PHRASES = [
  'compose email', 'compose a mail', 'compose mail',
  'new email', 'new mail', 'new message',
  'write email', 'write a mail', 'write mail', 'write a message', 'write message',
  'create email', 'create a mail', 'create mail', 'create message',
  'send email', 'send a mail', 'send mail', 'send a message', 'send message',
  'draft email', 'draft a mail', 'draft mail',
  'start email', 'start a mail', 'start mail',
  'compose', 'write', 'draft',
  'i want to write', 'i want to send', 'i want to compose',
  'let me write', 'let me send', 'let me compose',
  'i need to send', 'i need to write',
];

const INBOX_PHRASES = [
  'read inbox', 'check inbox', 'open inbox', 'go to inbox', 'show inbox',
  'read email', 'read emails', 'read my email', 'read my emails',
  'check email', 'check emails', 'check my email', 'check my emails',
  'my inbox', 'my emails', 'my messages', 'my mail',
  'view inbox', 'view emails', 'view messages', 'view mail',
  'show emails', 'show messages', 'show mail',
  'open emails', 'open messages', 'open mail',
  'what emails', 'any emails', 'any messages', 'any mail',
  'do i have mail', 'do i have email', 'do i have any',
  'inbox',
];

const LOGOUT_PHRASES = [
  'log out', 'logout', 'sign out', 'signout',
  'log me out', 'sign me out',
  'exit account', 'leave account',
  'disconnect', 'exit',
];

const BACK_PHRASES = [
  'go back', 'go home', 'go to home',
  'back', 'return', 'return home',
  'take me back', 'take me home',
  'previous screen', 'home screen',
  'main menu', 'main screen',
  'never mind', 'nevermind',
];

const SEND_PHRASES = [
  'send it', 'send email', 'send this', 'send now', 'send the email',
  'go ahead and send', 'go ahead send',
  'yes send', 'confirm send',
  'deliver', 'deliver it',
  'send',
];

const DELETE_PHRASES = [
  'delete', 'delete it', 'delete this', 'delete email', 'delete this email',
  'remove', 'remove it', 'remove this', 'remove email',
  'trash', 'trash it', 'throw away', 'get rid of',
  'erase', 'erase it',
  'discard', 'discard it',
];

const REPEAT_PHRASES = [
  'repeat', 'repeat that', 'say again', 'say that again',
  'again', 'one more time', 'come again',
  'read again', 'read it again', 'read that again',
  'what did you say', 'what was that',
  'play again', 'replay',
  'i missed that', "didn't hear", "didn't catch",
  'pardon', 'sorry what',
];

const START_OVER_PHRASES = [
  'start over', 'start again', 'start from scratch',
  'begin again', 'begin over',
  'restart', 'redo', 'redo it',
  'from the top', 'from the beginning',
  'clear', 'clear all', 'reset',
  'let me start over', 'i want to start over',
];

const NEXT_PHRASES = [
  'next', 'next one', 'next email', 'next message',
  'skip', 'skip it', 'skip this',
  'move on', 'go on', 'continue',
  'forward', 'go forward',
  'following', 'the next one',
  'after this', 'what else',
];

const PREVIOUS_PHRASES = [
  'previous', 'previous one', 'previous email', 'previous message',
  'before', 'the one before', 'before this',
  'last one', 'go back one', 'back one',
  'prior', 'prior one',
  'preceding',
];

const OPEN_PHRASES = [
  'open it', 'open this', 'open email', 'open that', 'open this one',
  'read it', 'read this', 'read this one', 'read that',
  'show it', 'show me', 'show this', 'show that',
  'let me see', 'let me read',
  'view it', 'view this',
  'open', 'read',
];

const YES_PHRASES = [
  'yes', 'yeah', 'yep', 'yup', 'ya',
  'correct', 'confirm', 'confirmed',
  'sure', 'sure thing', 'of course',
  'absolutely', 'definitely', 'affirmative',
  'that is correct', "that's correct", "that's right", 'right',
  'go ahead', 'proceed', 'do it',
  'okay', 'ok', 'alright', 'fine',
  'sounds good', 'perfect',
  'uh huh', 'mm hmm',
];

const NO_PHRASES = [
  'no', 'nope', 'nah', 'negative',
  'wrong', 'incorrect', 'not right', "that's wrong",
  'cancel', 'cancel that', 'stop',
  'abort', 'forget it', 'forget that',
  'not that', 'try again',
  "that's not right", "that's not correct",
  "don't", "do not",
];

const HELP_PHRASES = [
  'help', 'help me', 'i need help',
  'what can i say', 'what can i do',
  'what are the commands', 'show commands', 'list commands',
  'options', 'what are my options',
  'instructions', 'how do i', 'how does this work',
  'guide', 'tutorial',
];

/**
 * Parse raw speech text into a structured command.
 *
 * Uses a phrase-matching approach where the most specific
 * phrases are checked first. This prevents "send email"
 * from matching the generic "send" action.
 *
 * @param text - Raw transcription from speech recognition
 * @returns Parsed command object
 */
export function parseCommand(text: string): VoiceCommand {
  const lower = text.toLowerCase().trim();

  // ─── Priority 1: Compound phrases (most specific first) ──

  // "send email" / "send a message" → compose, NOT send
  if (matchesPhrases(lower, COMPOSE_PHRASES)) {
    return { action: 'compose' };
  }

  if (matchesPhrases(lower, INBOX_PHRASES)) {
    return { action: 'inbox' };
  }

  if (matchesPhrases(lower, LOGOUT_PHRASES)) {
    return { action: 'logout' };
  }

  if (matchesPhrases(lower, BACK_PHRASES)) {
    return { action: 'back' };
  }

  // ─── Priority 2: Action commands ─────────────────────────

  if (matchesPhrases(lower, DELETE_PHRASES)) {
    return { action: 'delete' };
  }

  if (matchesPhrases(lower, START_OVER_PHRASES)) {
    return { action: 'start_over' };
  }

  if (matchesPhrases(lower, REPEAT_PHRASES)) {
    return { action: 'repeat' };
  }

  // ─── Priority 3: List navigation ─────────────────────────

  if (matchesPhrases(lower, NEXT_PHRASES)) {
    return { action: 'next' };
  }

  if (matchesPhrases(lower, PREVIOUS_PHRASES)) {
    return { action: 'previous' };
  }

  // ─── Priority 4: Open specific email ─────────────────────

  if (matchesPhrases(lower, OPEN_PHRASES)) {
    const index = extractNumber(lower);
    return { action: 'open', index };
  }

  // ─── Priority 5: Send (after compose check) ──────────────
  // This comes after compose so "send email" → compose, "send" → send
  if (matchesPhrases(lower, SEND_PHRASES)) {
    return { action: 'send' };
  }

  // ─── Priority 6: Yes/No confirmation ─────────────────────

  if (matchesPhrases(lower, YES_PHRASES)) {
    return { action: 'yes' };
  }

  if (matchesPhrases(lower, NO_PHRASES)) {
    return { action: 'no' };
  }

  // ─── Priority 7: Help ────────────────────────────────────

  if (matchesPhrases(lower, HELP_PHRASES)) {
    return { action: 'help' };
  }

  // ─── Unknown ─────────────────────────────────────────────
  return { action: 'unknown', raw: text };
}

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Check if text matches any of the given phrases.
 * Uses includes() for flexibility — "please compose an email"
 * will match the phrase "compose".
 */
function matchesPhrases(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => text.includes(phrase));
}

/**
 * Extract a number from spoken text.
 * Handles both digits ("3") and ordinals ("first", "second").
 */
function extractNumber(text: string): number | undefined {
  const ordinals: Record<string, number> = {
    first: 1, second: 2, third: 3, fourth: 4, fifth: 5,
    sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
    '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5,
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    last: -1,
  };

  for (const [word, num] of Object.entries(ordinals)) {
    if (text.includes(word)) return num;
  }

  const match = text.match(/\d+/);
  if (match) return parseInt(match[0], 10);

  return undefined;
}

/**
 * Extract an email address from spoken text.
 *
 * Handles common speech-to-text quirks:
 * - "john at gmail dot com" → "john@gmail.com"
 * - "j.doe at outlook dot com" → "j.doe@outlook.com"
 */
export function extractEmail(text: string): string | null {
  let cleaned = text.toLowerCase().trim();

  // Replace spoken email patterns
  cleaned = cleaned.replace(/\s+at\s+/g, '@');
  cleaned = cleaned.replace(/\s+dot\s+/g, '.');
  cleaned = cleaned.replace(/\s+dash\s+/g, '-');
  cleaned = cleaned.replace(/\s+underscore\s+/g, '_');
  // Remove remaining spaces
  cleaned = cleaned.replace(/\s+/g, '');

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(cleaned)) {
    return cleaned;
  }

  return null;
}
