/**
 * Telegram MarkdownV2 格式轉換工具
 * 將標準 Markdown 轉換為 Telegram MarkdownV2 安全格式
 */

// MarkdownV2 需要轉義的特殊字元
const SPECIAL_CHARS = /[_*\[\]()~`>#+\-=|{}.!\\]/g;

/**
 * 轉義 MarkdownV2 特殊字元
 */
function escapeMarkdownV2(text: string): string {
  return text.replace(SPECIAL_CHARS, '\\$&');
}

/**
 * 轉義程式碼區塊內部的字元（只需轉義 ` 和 \）
 */
function escapeCodeContent(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/`/g, '\\`');
}

/**
 * 將標準 Markdown 轉換為 Telegram MarkdownV2 格式
 *
 * 處理順序：
 * 1. 程式碼區塊 (```)
 * 2. 行內程式碼 (`)
 * 3. 粗體 (**text**)
 * 4. 斜體 (*text* 或 _text_)
 * 5. 連結 ([text](url))
 * 6. 其餘特殊字元轉義
 */
export function convertToMarkdownV2(text: string): string {
  const result: string[] = [];
  let i = 0;

  while (i < text.length) {
    // 1. 程式碼區塊 ```
    if (text.startsWith('```', i)) {
      const endIdx = text.indexOf('```', i + 3);
      if (endIdx !== -1) {
        // 取得語言標記和內容
        const block = text.substring(i + 3, endIdx);
        const newlineIdx = block.indexOf('\n');
        let lang = '';
        let code: string;
        if (newlineIdx !== -1) {
          lang = block.substring(0, newlineIdx).trim();
          code = block.substring(newlineIdx + 1);
        } else {
          code = block;
        }
        result.push('```');
        if (lang) result.push(lang);
        result.push('\n');
        result.push(escapeCodeContent(code));
        result.push('```');
        i = endIdx + 3;
        continue;
      }
    }

    // 2. 行內程式碼 `
    if (text[i] === '`') {
      const endIdx = text.indexOf('`', i + 1);
      if (endIdx !== -1) {
        const code = text.substring(i + 1, endIdx);
        result.push('`');
        result.push(escapeCodeContent(code));
        result.push('`');
        i = endIdx + 1;
        continue;
      }
    }

    // 3. 粗體 **text** → MarkdownV2 *text*
    if (text.startsWith('**', i)) {
      const endIdx = text.indexOf('**', i + 2);
      if (endIdx !== -1) {
        const inner = text.substring(i + 2, endIdx);
        result.push('*');
        result.push(escapeMarkdownV2(inner));
        result.push('*');
        i = endIdx + 2;
        continue;
      }
    }

    // 4a. 斜體 *text* → MarkdownV2 _text_
    // （前面已排除 ** 的情況）
    if (text[i] === '*') {
      const endIdx = text.indexOf('*', i + 1);
      if (endIdx !== -1 && !text.startsWith('**', endIdx)) {
        const inner = text.substring(i + 1, endIdx);
        // 確保不是空內容
        if (inner.length > 0) {
          result.push('_');
          result.push(escapeMarkdownV2(inner));
          result.push('_');
          i = endIdx + 1;
          continue;
        }
      }
    }

    // 4b. 斜體 _text_ → MarkdownV2 _text_
    if (text[i] === '_') {
      // 尋找結束的 _，但排除 __（可能是其他格式）
      const endIdx = text.indexOf('_', i + 1);
      if (endIdx !== -1) {
        const inner = text.substring(i + 1, endIdx);
        if (inner.length > 0 && !inner.includes('\n')) {
          result.push('_');
          result.push(escapeMarkdownV2(inner));
          result.push('_');
          i = endIdx + 1;
          continue;
        }
      }
    }

    // 5. 連結 [text](url)
    if (text[i] === '[') {
      const closeBracket = text.indexOf(']', i + 1);
      if (closeBracket !== -1 && text[closeBracket + 1] === '(') {
        const closeParen = text.indexOf(')', closeBracket + 2);
        if (closeParen !== -1) {
          const linkText = text.substring(i + 1, closeBracket);
          const url = text.substring(closeBracket + 2, closeParen);
          result.push('[');
          result.push(escapeMarkdownV2(linkText));
          result.push('](');
          // URL 中只需轉義 ) 和 \
          result.push(url.replace(/\\/g, '\\\\').replace(/\)/g, '\\)'));
          result.push(')');
          i = closeParen + 1;
          continue;
        }
      }
    }

    // 6. 一般字元：轉義特殊字元
    if (SPECIAL_CHARS.test(text[i])) {
      result.push('\\');
      result.push(text[i]);
    } else {
      result.push(text[i]);
    }
    // Reset lastIndex since we use .test() with a global regex
    SPECIAL_CHARS.lastIndex = 0;
    i++;
  }

  return result.join('');
}
