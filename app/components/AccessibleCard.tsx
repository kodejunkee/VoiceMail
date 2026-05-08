/**
 * AccessibleCard Component
 *
 * High-contrast card for displaying email items.
 * Large text, big touch targets, clear visual hierarchy.
 */

import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

interface AccessibleCardProps {
  /** Email sender */
  sender: string;
  /** Email subject */
  subject: string;
  /** Preview of the message */
  preview?: string;
  /** Timestamp */
  time?: string;
  /** Whether the email has been read */
  isRead?: boolean;
  /** Called when the card is tapped */
  onPress: () => void;
  /** Index for accessibility */
  index?: number;
}

export function AccessibleCard({
  sender,
  subject,
  preview,
  time,
  isRead = false,
  onPress,
  index,
}: AccessibleCardProps) {
  const accessLabel = `Email ${index ? index + ': ' : ''}from ${sender}. Subject: ${subject}. ${isRead ? 'Read' : 'Unread'}.`;

  return (
    <TouchableOpacity
      style={[styles.card, !isRead && styles.unreadCard]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={accessLabel}
      accessibilityRole="button"
      accessibilityHint="Double tap to open this email"
    >
      <View style={styles.content}>
        {/* Sender row */}
        <View style={styles.headerRow}>
          <Ionicons
            name="person-circle-outline"
            size={24}
            color={isRead ? Colors.textSecondary : Colors.primary}
          />
          <Text
            style={[
              styles.sender,
              !isRead && styles.unreadText,
            ]}
            numberOfLines={1}
          >
            {sender}
          </Text>
          {time && (
            <Text style={styles.time}>{formatTime(time)}</Text>
          )}
        </View>

        {/* Subject */}
        <Text
          style={[styles.subject, !isRead && styles.unreadText]}
          numberOfLines={1}
        >
          {subject}
        </Text>

        {/* Preview */}
        {preview && (
          <Text style={styles.preview} numberOfLines={2}>
            {preview}
          </Text>
        )}
      </View>

      <Ionicons
        name="chevron-forward"
        size={24}
        color={Colors.textMuted}
      />
    </TouchableOpacity>
  );
}

/** Format ISO timestamp to readable time */
function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 80,
  },
  unreadCard: {
    borderColor: Colors.primaryDark,
    borderWidth: 1,
    borderLeftWidth: 5,
    borderLeftColor: Colors.primary,
    backgroundColor: Colors.surfaceElevated,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sender: {
    fontSize: 15,
    color: Colors.textSecondary,
    flex: 1,
    letterSpacing: 0.2,
  },
  unreadText: {
    color: Colors.text,
    fontWeight: '800',
  },
  time: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  subject: {
    fontSize: 17,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: -0.3,
  },
  preview: {
    fontSize: 14,
    color: Colors.textMuted,
    lineHeight: 22,
    marginTop: 4,
  },
});
