# Bot Memory Feature - Implementation Plan

## Current State

The bot currently has **no conversation memory** when responding via AI. Each `@mention` triggers an AI call with only the current message text — no history, no context, no prior knowledge of the user or group.

The bot already stores `recentMessages` (last 100) per member in Firestore, but this data is never used for AI responses.

## Feature Overview

Add two types of memory:

1. **Conversation Context** — Inject recent group chat history into AI prompts so the bot understands the ongoing conversation
2. **Explicit Memory** — Users can tell the bot to remember specific facts (e.g., "@bot 記住小明的生日是3月5日"), and the bot recalls them in future AI responses

---

## Step-by-step Plan

### Step 1: Define Memory Data Model

Add a new Firestore sub-collection under each group:

```
groups/{groupId}/memories/{memoryId}
  - content: string          // The memory content
  - createdBy: number        // User ID who created it
  - createdByName: string    // Display name of creator
  - createdAt: Timestamp     // When created
```

Add a new TypeScript interface in `functions/src/types/index.ts`:

```typescript
export interface Memory {
  content: string;
  createdBy: number;
  createdByName: string;
  createdAt: FirebaseFirestore.Timestamp;
}
```

### Step 2: Create MemoryService

Create `functions/src/services/memoryService.ts` with:

- `addMemory(groupId, userId, userName, content)` — Save a new memory
- `getMemories(groupId, limit?)` — Get recent memories for a group (default 20)
- `searchMemories(groupId, keyword)` — Search memories by keyword
- `deleteMemory(groupId, memoryId)` — Delete a specific memory
- `deleteMemoriesByKeyword(groupId, keyword)` — Delete memories matching keyword
- `getMemoryCount(groupId)` — Get total memory count for a group

### Step 3: Create Conversation Context Helper

Create `functions/src/services/contextService.ts` with:

- `getRecentGroupMessages(groupId, limit?)` — Aggregate recent messages across all members in the group, sorted by timestamp (last 20 messages)
- `buildConversationContext(groupId)` — Format recent messages into a string for AI prompt injection
- `buildMemoryContext(groupId)` — Format relevant memories into a string for AI prompt injection

### Step 4: Modify AI Services to Accept Context

Update the `callAI` function signature in `aiService.ts`:

```typescript
export async function callAI(
  userMessage: string,
  context?: { conversationHistory?: string; memories?: string }
): Promise<string>
```

Update both `ollamaService.ts` and `openaiService.ts`:
- Modify `callOllama(userMessage, context?)` and `callOpenAI(userMessage, context?)`
- Inject `context.memories` into the system prompt (appended as "你記得的事情：...")
- Inject `context.conversationHistory` as additional messages/prompt context before the user message

### Step 5: Add Memory Commands to Webhook

Add the following command handlers in `webhook.ts`:

1. **`/remember <content>`** (group only)
   - Parse content after command
   - Call `MemoryService.addMemory()`
   - Reply with confirmation message

2. **`/forget <keyword>`** (group only)
   - Search and delete memories matching keyword
   - Reply with count of deleted memories

3. **`/memories`** (group only)
   - Fetch recent memories via `MemoryService.getMemories()`
   - Format and display as numbered list

### Step 6: Enhance AI Mention Handler with Context

In `webhook.ts` `handleMessage()`, when bot is mentioned:

1. Call `contextService.buildConversationContext(groupId)` to get recent chat history
2. Call `contextService.buildMemoryContext(groupId)` to get relevant memories
3. Pass both to `callAI(userMessage, { conversationHistory, memories })`

### Step 7: Update Firestore Rules

Add read/write rules for the new `memories` sub-collection in `firestore.rules`:

```
match /groups/{groupId}/memories/{memoryId} {
  allow read: if true;  // Public read (same as group stats)
  allow delete: if request.auth != null && request.auth.token.email == 'cyy25121@gmail.com';
}
```

(Writes happen through Cloud Functions, not client-side)

### Step 8: Store Group-level Conversation History

Currently, `recentMessages` is stored per-member. To support group-level conversation context, add a new sub-collection:

```
groups/{groupId}/chatHistory/{docId}
  - userId: number
  - userName: string
  - text: string
  - timestamp: Timestamp
  - type: 'text' | 'photo' | 'sticker' | 'link'
```

In `webhook.ts`, after processing each message, also append to `chatHistory` (keeping the last 50 messages via cleanup).

---

## Files to Create

| File | Purpose |
|------|---------|
| `functions/src/services/memoryService.ts` | Memory CRUD operations |
| `functions/src/services/contextService.ts` | Build AI context from history + memories |

## Files to Modify

| File | Changes |
|------|---------|
| `functions/src/types/index.ts` | Add `Memory` and `ChatHistoryEntry` interfaces |
| `functions/src/services/aiService.ts` | Accept and pass context parameter |
| `functions/src/services/ollamaService.ts` | Inject context into prompt |
| `functions/src/services/openaiService.ts` | Inject context into messages |
| `functions/src/telegram/webhook.ts` | Add `/remember`, `/forget`, `/memories` commands; pass context to AI; store chat history |
| `firestore.rules` | Add rules for `memories` and `chatHistory` collections |

## Behavior Summary

- When a user sends `@bot 記住明天要開會`, the bot stores "明天要開會" as a memory and confirms
- When a user sends `@bot 我們之前說了什麼？`, the bot's AI receives recent chat history + stored memories as context, enabling it to answer based on prior conversation
- When a user sends `/memories`, the bot lists all stored memories for the group
- When a user sends `/forget 開會`, the bot deletes memories containing "開會"
- Memory is per-group, shared across all members
