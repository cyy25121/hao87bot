# Bot Context Injection Feature - Implementation Plan

## Current State

The bot currently has **no conversation memory** when responding via AI. Each `@mention` triggers an AI call with only the current message text — no history, no context, no prior knowledge of the user or group.

The bot already stores `recentMessages` (last 100) per member in Firestore, but this data is never used for AI responses.

## Feature Overview

Add a **time-limited context injection** feature:

- `/remember` activates context mode for **1 hour** in a group
- While active, the bot collects recent chat history from all group members and injects it into AI prompts when @mentioned
- After 1 hour, context mode automatically expires — the bot goes back to responding without history
- No permanent memory/facts storage

---

## Step-by-step Plan

### Step 1: Add Context State to Group Data Model

Add a `contextActiveUntil` field to the group document in Firestore:

```
groups/{groupId}
  - contextActiveUntil: Timestamp | null  // When context mode expires (null = inactive)
```

Add to `GroupStats` interface in `functions/src/types/index.ts`:

```typescript
contextActiveUntil?: FirebaseFirestore.Timestamp | null;
```

Also add a `ChatHistoryEntry` interface for the new group-level chat history sub-collection:

```typescript
export interface ChatHistoryEntry {
  userId: number;
  userName: string;
  text: string;
  timestamp: FirebaseFirestore.Timestamp;
  type: 'text' | 'photo' | 'sticker' | 'link';
}
```

### Step 2: Store Group-level Chat History

Currently, `recentMessages` is stored per-member, which makes it hard to reconstruct a group conversation timeline. Add a new sub-collection:

```
groups/{groupId}/chatHistory/{docId}
  - userId: number
  - userName: string
  - text: string
  - timestamp: Timestamp
  - type: 'text' | 'photo' | 'sticker' | 'link'
```

In `webhook.ts`, after processing each message, also append to `chatHistory`. Keep the last 50 messages via cleanup (delete oldest when count exceeds 50).

### Step 3: Create ContextService

Create `functions/src/services/contextService.ts` with:

- `activateContext(groupId)` — Set `contextActiveUntil` to `now + 1 hour` on the group document
- `isContextActive(groupId)` — Check if `contextActiveUntil` is in the future
- `getRecentGroupMessages(groupId, limit?)` — Fetch recent messages from the `chatHistory` sub-collection (last 20 messages)
- `buildConversationContext(groupId)` — Format recent messages into a string for AI prompt injection, e.g.:
  ```
  以下是群組最近的對話：
  [小明]: 今天天氣真好
  [小華]: 對啊，我們去爬山吧
  [小明]: 好主意！
  ```

### Step 4: Modify AI Services to Accept Context

Update the `callAI` function signature in `aiService.ts`:

```typescript
export async function callAI(
  userMessage: string,
  conversationContext?: string
): Promise<string>
```

Update both `ollamaService.ts` and `openaiService.ts`:
- Modify `callOllama(userMessage, conversationContext?)` and `callOpenAI(userMessage, conversationContext?)`
- If `conversationContext` is provided, append it to the system prompt so the AI can see the recent conversation

### Step 5: Add `/remember` Command to Webhook

Add the `/remember` command handler in `webhook.ts`:

- **`/remember`** (group only)
  - Call `contextService.activateContext(groupId)`
  - Reply with confirmation: "已啟動上下文記憶模式，將持續1小時 ⏰"

### Step 6: Enhance AI Mention Handler with Context Injection

In `webhook.ts` `handleMessage()`, when bot is mentioned:

1. Call `contextService.isContextActive(groupId)` to check if context mode is on
2. If active:
   - Call `contextService.buildConversationContext(groupId)` to get recent chat history
   - Pass context to `callAI(userMessage, conversationContext)`
3. If not active:
   - Call `callAI(userMessage)` as before (no context)

---

## Files to Create

| File | Purpose |
|------|---------|
| `functions/src/services/contextService.ts` | Context activation, chat history retrieval, prompt building |

## Files to Modify

| File | Changes |
|------|---------|
| `functions/src/types/index.ts` | Add `contextActiveUntil` to `GroupStats`, add `ChatHistoryEntry` interface |
| `functions/src/services/aiService.ts` | Accept and pass `conversationContext` parameter |
| `functions/src/services/ollamaService.ts` | Inject conversation context into prompt |
| `functions/src/services/openaiService.ts` | Inject conversation context into messages |
| `functions/src/telegram/webhook.ts` | Add `/remember` command; store chat history; pass context to AI when active |

## Behavior Summary

- When a user sends `/remember`, the bot activates context mode for 1 hour and confirms
- During the active hour, every `@bot` mention includes the last 20 group messages as context in the AI prompt
- After 1 hour, context mode expires silently — `@bot` mentions go back to no-context mode
- Users can send `/remember` again to reset the 1-hour timer
- Chat history is stored continuously (last 50 messages) regardless of context mode, so it's ready when activated
