export const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '👏', '🔥', '💗']

/**
 * Toggles an emoji reaction for a given user on a reactions dictionary.
 * Reactions schema: { [emoji: string]: string[] } (array of user IDs)
 *
 * @param {Object} currentReactions - Existing reactions object
 * @param {string} emoji - Emoji to toggle
 * @param {string} userId - User ID who reacted
 * @returns {Object} Updated reactions object
 */
export function toggleMessageReaction(currentReactions = {}, emoji, userId) {
  if (!userId || !emoji) return currentReactions ? { ...currentReactions } : {}

  const updated = { ...(currentReactions || {}) }
  const currentList = Array.isArray(updated[emoji]) ? [...updated[emoji]] : []
  const userIndex = currentList.indexOf(userId)

  if (userIndex > -1) {
    currentList.splice(userIndex, 1)
  } else {
    currentList.push(userId)
  }

  if (currentList.length > 0) {
    updated[emoji] = currentList
  } else {
    delete updated[emoji]
  }

  return updated
}

/**
 * Returns total count of all reactions on a message
 * @param {Object} reactions
 * @returns {number}
 */
export function getTotalReactionCount(reactions = {}) {
  if (!reactions || typeof reactions !== 'object') return 0
  return Object.values(reactions).reduce((sum, list) => {
    return sum + (Array.isArray(list) ? list.length : 0)
  }, 0)
}
