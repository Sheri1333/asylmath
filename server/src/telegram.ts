import { settings } from "./db.js";

/**
 * Telegram bot for Kaspi payment checks. Exactly one admin: the chat set in
 * TELEGRAM_ADMIN_ID, or else the first chat that sends `/start <TELEGRAM_BIND_CODE>`.
 * Once an admin is bound, every other chat is ignored without a reply.
 */

const ADMIN_DOC = "telegram-admin";

export interface TelegramMessageRef {
  chatId: number;
  messageId: number;
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    text?: string;
    chat: { id: number; type: string };
    from?: { id: number };
  };
  callback_query?: {
    id: string;
    data?: string;
    from: { id: number };
  };
}

function botToken(): string {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || "";
}

export function bindCode(): string {
  return process.env.TELEGRAM_BIND_CODE?.trim() || "";
}

function pinnedAdminId(): number | null {
  const raw = process.env.TELEGRAM_ADMIN_ID?.trim();
  if (!raw) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) ? id : null;
}

function safeError(err: unknown, token: string): string {
  const raw = err instanceof Error ? err.message : String(err);
  return token ? raw.split(token).join("[token]") : raw;
}

async function api<T>(token: string, method: string, body: Record<string, unknown>, timeoutMs = 15_000): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    throw new Error(safeError(err, token));
  }
  const data = (await res.json().catch(() => null)) as { ok?: boolean; result?: T; description?: string } | null;
  if (!data?.ok) throw new Error(data?.description || `Telegram ${method} failed (${res.status})`);
  return data.result as T;
}

/** The one chat allowed to use the bot, or null while nobody is bound. */
export async function telegramAdminId(): Promise<number | null> {
  const pinned = pinnedAdminId();
  if (pinned !== null) return pinned;
  const doc = await settings().findOne({ _id: ADMIN_DOC });
  const id = doc?.chatId;
  return typeof id === "number" && Number.isSafeInteger(id) ? id : null;
}

/** Binds the admin only if no admin exists yet. Returns false when the seat is taken. */
export async function claimTelegramAdmin(chatId: number): Promise<boolean> {
  if (pinnedAdminId() !== null) return false;
  try {
    const res = await settings().updateOne(
      { _id: ADMIN_DOC, chatId: { $exists: false } },
      { $set: { chatId, boundAt: new Date() } },
      { upsert: true },
    );
    return res.modifiedCount + res.upsertedCount === 1;
  } catch {
    // Duplicate key: the document already holds another chat.
    return false;
  }
}

export async function isTelegramAdmin(chatId: number): Promise<boolean> {
  return (await telegramAdminId()) === chatId;
}

function keyboard(enrollmentId: string) {
  return {
    inline_keyboard: [
      [
        { text: "✅ Подтвердить", callback_data: `ok:${enrollmentId}` },
        { text: "❌ Отклонить", callback_data: `no:${enrollmentId}` },
      ],
    ],
  };
}

export async function sendTelegramText(chatId: number, text: string): Promise<void> {
  const token = botToken();
  if (!token) return;
  await api(token, "sendMessage", { chat_id: chatId, text });
}

export async function sendPaymentCard(text: string, enrollmentId: string): Promise<TelegramMessageRef[]> {
  const token = botToken();
  if (!token) return [];
  const chatId = await telegramAdminId();
  if (chatId === null) return [];
  try {
    const msg = await api<{ message_id: number }>(token, "sendMessage", {
      chat_id: chatId,
      text,
      reply_markup: keyboard(enrollmentId),
    });
    return [{ chatId, messageId: msg.message_id }];
  } catch (err) {
    console.error("Telegram send:", safeError(err, token));
    return [];
  }
}

/** Rewrites the card; enrollmentId null removes the buttons (decision made). */
export async function editPaymentCard(messages: TelegramMessageRef[], text: string, enrollmentId: string | null): Promise<void> {
  const token = botToken();
  if (!token) return;
  for (const msg of messages) {
    try {
      await api(token, "editMessageText", {
        chat_id: msg.chatId,
        message_id: msg.messageId,
        text,
        reply_markup: enrollmentId ? keyboard(enrollmentId) : { inline_keyboard: [] },
      });
    } catch (err) {
      const message = safeError(err, token);
      if (!message.includes("message is not modified")) console.error("Telegram edit:", message);
    }
  }
}

export async function answerTelegramCallback(callbackId: string, text: string): Promise<void> {
  const token = botToken();
  if (!token) return;
  try {
    await api(token, "answerCallbackQuery", { callback_query_id: callbackId, text });
  } catch (err) {
    console.error("Telegram callback:", safeError(err, token));
  }
}

export function startTelegramPolling(handle: (update: TelegramUpdate) => Promise<void>): void {
  const token = botToken();
  if (!token) {
    console.log("Telegram: выключен, нет TELEGRAM_BOT_TOKEN");
    return;
  }
  void poll(token, handle);
}

async function poll(token: string, handle: (update: TelegramUpdate) => Promise<void>): Promise<void> {
  try {
    await api(token, "deleteWebhook", {});
    const me = await api<{ username?: string }>(token, "getMe", {});
    await api(token, "setMyCommands", {
      commands: [{ command: "start", description: "Подключить уведомления об оплате" }],
    });
    const admin = await telegramAdminId();
    console.log(`Telegram: бот @${me.username ?? "unknown"} на связи` + (admin === null ? ", администратор ещё не подключён" : ""));
  } catch (err) {
    console.error("Telegram: не удалось запустить бота:", safeError(err, token));
    return;
  }

  let offset = 0;
  for (;;) {
    try {
      const updates = await api<TelegramUpdate[]>(
        token,
        "getUpdates",
        { offset, timeout: 25, allowed_updates: ["message", "callback_query"] },
        35_000,
      );
      for (const update of updates) {
        offset = update.update_id + 1;
        try {
          await handle(update);
        } catch (err) {
          console.error("Telegram update:", safeError(err, token));
        }
      }
    } catch (err) {
      const message = safeError(err, token);
      if (message.includes("401") || message.includes("Unauthorized")) {
        console.error("Telegram: токен отклонён");
        return;
      }
      console.error("Telegram poll:", message);
      await new Promise((resolve) => setTimeout(resolve, message.includes("409") ? 5000 : 2000));
    }
  }
}
