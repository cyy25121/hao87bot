export interface GroupStats {
  groupId: number;
  title: string;
  messageCount: number;
  linkCount: number;
  photoCount: number;
  stickerCount: number;
  lastImageAt: number;
  threshold: number;
  createdAt: FirebaseFirestore.Timestamp;
}

export interface StoredMessage {
  text: string;
  timestamp: FirebaseFirestore.Timestamp;
  type: 'text' | 'photo' | 'sticker' | 'link';
}

export interface MemberStats {
  userId: number;
  username?: string;
  firstName?: string;
  messageCount: number;
  linkCount: number;
  photoCount: number;
  stickerCount: number;
  lastMessage: string;
  recentMessages: StoredMessage[];
  lastActiveAt: FirebaseFirestore.Timestamp;
}

export interface GeneratedImage {
  url: string;
  prompt: string;
  generatedAt: FirebaseFirestore.Timestamp;
  messageCountSnapshot: number;
}

export interface StickerStats {
  fileUniqueId: string;
  fileId?: string;
  emoji?: string;
  setName?: string;
  count: number;
  lastUsedAt: FirebaseFirestore.Timestamp;
  lastUsedBy: number;
}

export interface TelegramMessage {
  message_id: number;
  from?: {
    id: number;
    is_bot: boolean;
    first_name: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
    title?: string;
  };
  text?: string;
  caption?: string;
  photo?: Array<{
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    file_size?: number;
  }>;
  sticker?: {
    file_id: string;
    file_unique_id: string;
    emoji?: string;
    set_name?: string;
    type?: string;
    custom_emoji_id?: string;
    width: number;
    height: number;
    is_animated?: boolean;
    is_video?: boolean;
  };
  entities?: Array<{
    type: string;
    offset: number;
    length: number;
    url?: string;
  }>;
  caption_entities?: Array<{
    type: string;
    offset: number;
    length: number;
    url?: string;
  }>;
  date: number;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  my_chat_member?: {
    chat: {
      id: number;
      type: string;
      title?: string;
    };
    from: {
      id: number;
    };
    new_chat_member: {
      status: string;
    };
    old_chat_member: {
      status: string;
    };
  };
}
