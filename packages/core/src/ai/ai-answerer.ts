import type { ChatMessage } from '../brain/types';
import type { Lang } from '../brain/lang';
import type { Answerer, ChatAnswer, FaqChat } from '../chat/faq-chat';
import type { ChatReply, ChatRequest } from './chat-service';

export type ChatTransport = (req: ChatRequest) => Promise<ChatReply>;

export interface AiAnswererOptions {
  faq: FaqChat;
  send: ChatTransport;
  guideName?: string;
  siteName?: string;
  /** Extra facts, e.g. the current page's text (added in step 3). */
  extraContext?: (question: string) => ChatRequest['context'];
  history?: () => ChatMessage[];
  /** Calls allowed per page view before falling back to keyword answers. */
  maxCalls?: number;
}

/**
 * Asks the AI with the site's own facts, and falls back to keyword FAQ answers when the AI is
 * off, slow, over its limit or unsure. A confident FAQ hit is used as-is to save a call.
 */
export class AiAnswerer implements Answerer {
  private calls = 0;

  constructor(private opts: AiAnswererOptions) {}

  async answer(question: string, lang: Lang): Promise<ChatAnswer> {
    const { faq } = this.opts;
    const local = await faq.answer(question, lang);
    if (local.matched && local.source?.startsWith('faq:')) return local;
    if (this.calls >= (this.opts.maxCalls ?? 18)) return local;
    this.calls++;
    try {
      const context = [...faq.retrieve(question, lang), ...(this.opts.extraContext?.(question) ?? [])];
      const reply = await this.opts.send({
        question,
        lang,
        context,
        history: (this.opts.history?.() ?? []).slice(-5, -1).map((m) => ({ from: m.from, text: m.text })),
        guideName: this.opts.guideName,
        siteName: this.opts.siteName,
      });
      if (!reply.found && !local.matched) return { ...local, text: reply.answer || local.text };
      if (!reply.found) return local;
      return { text: reply.answer, buttons: local.matched ? local.buttons : [], matched: true, source: 'ai' };
    } catch {
      return local;
    }
  }
}
