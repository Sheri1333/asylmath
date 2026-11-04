import type { ObjectId } from "mongodb";
import { courses, enrollments, toObjectId, users, type EnrollmentDoc } from "./db.js";
import {
  answerTelegramCallback,
  bindCode,
  claimTelegramAdmin,
  editPaymentCard,
  isTelegramAdmin,
  sendPaymentCard,
  sendTelegramText,
  telegramAdminId,
  type TelegramUpdate,
} from "./telegram.js";

/**
 * Kaspi "Оплата услуги" sends no callback. The student pays by the QR or the
 * Kaspi button and presses pay; the course enrollment turns pending and the
 * admin confirms or rejects the transfer from a Telegram card (or the admin page).
 */

let missingAdminLogged = false;

async function cardText(doc: EnrollmentDoc, statusLine?: string): Promise<string> {
  const [user, course] = await Promise.all([
    users().findOne({ _id: doc.userId }, { projection: { name: 1, email: 1 } }),
    courses().findOne({ _id: doc.courseId }, { projection: { title: 1, priceTenge: 1 } }),
  ]);
  const when = (doc.paidAt ?? doc.enrolledAt).toLocaleString("ru-RU", { timeZone: "Asia/Almaty" });
  const amount = doc.amountTenge ?? course?.priceTenge ?? 0;
  return [
    "💳 Оплата курса",
    "",
    `Ученик: ${user?.name ?? "—"}`,
    `Почта: ${user?.email ?? "аккаунт не найден"}`,
    `Курс: ${course?.title ?? doc.courseId}`,
    `Сумма: ${amount.toLocaleString("ru-RU")} ₸`,
    `Имя в Kaspi: ${doc.payerName || doc.requestNote || "—"}`,
    `Время: ${when}`,
    "",
    statusLine ?? "Проверьте перевод в Kaspi и нажмите кнопку.",
  ].join("\n");
}

/** Sends the Telegram card once per attempt; a parallel click finds notifiedAt set and stops. */
export async function notifyPayment(id: ObjectId): Promise<void> {
  const claimed = await enrollments().findOneAndUpdate(
    {
      _id: id,
      status: "pending",
      notifiedAt: { $exists: false },
      $or: [{ telegramMessages: { $exists: false } }, { telegramMessages: { $size: 0 } }],
    },
    { $set: { notifiedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!claimed) return;
  const release = () => enrollments().updateOne({ _id: id }, { $unset: { notifiedAt: "" } });
  if ((await telegramAdminId()) === null) {
    await release();
    if (!missingAdminLogged) {
      missingAdminLogged = true;
      console.error("Telegram: заявка на оплату сохранена, администратор ещё не написал боту /start");
    }
    return;
  }
  try {
    const messages = await sendPaymentCard(await cardText(claimed), claimed._id.toHexString());
    if (messages.length === 0) {
      await release();
      return;
    }
    await enrollments().updateOne({ _id: id }, { $set: { telegramMessages: messages } });
  } catch (err) {
    console.error("Telegram notify:", err instanceof Error ? err.message : err);
    await release();
  }
}

/** Keeps an open card in sync after the student changes the Kaspi name. */
export async function refreshPaymentCard(doc: EnrollmentDoc): Promise<void> {
  if (!doc.telegramMessages?.length) return;
  await editPaymentCard(doc.telegramMessages, await cardText(doc), doc._id.toHexString());
}

/** Sends cards for attempts saved while no admin was bound. */
async function notifyUnsent(): Promise<void> {
  const list = await enrollments()
    .find({
      status: "pending",
      $or: [{ telegramMessages: { $exists: false } }, { telegramMessages: { $size: 0 } }],
    })
    .sort({ enrolledAt: -1 })
    .limit(15)
    .toArray();
  for (const doc of list) {
    await enrollments().updateOne({ _id: doc._id }, { $unset: { notifiedAt: "" } });
    await notifyPayment(doc._id);
  }
}

/** Confirms (opens the course) or rejects a pending payment, then closes the Telegram card. */
export async function decidePayment(
  id: ObjectId,
  decision: "confirmed" | "rejected",
  via: "admin" | "telegram",
): Promise<EnrollmentDoc | "missing" | "done"> {
  const now = new Date();
  const updated = await enrollments().findOneAndUpdate(
    { _id: id, status: "pending" },
    {
      $set:
        decision === "confirmed"
          ? { status: "active", activatedAt: now, decidedVia: via }
          : { status: "rejected", decidedVia: via },
    },
    { returnDocument: "after" },
  );
  if (!updated) {
    const existing = await enrollments().findOne({ _id: id }, { projection: { _id: 1 } });
    return existing ? "done" : "missing";
  }
  if (updated.telegramMessages?.length) {
    const line =
      decision === "confirmed"
        ? `✅ Подтверждено${via === "admin" ? " на сайте" : ""}. Курс открыт.`
        : `❌ Отклонено${via === "admin" ? " на сайте" : ""}. Перевод не засчитан.`;
    await editPaymentCard(updated.telegramMessages, await cardText(updated, line), null);
  }
  return updated;
}

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  if (update.callback_query) {
    await onCallback(update.callback_query);
    return;
  }
  const message = update.message;
  if (!message?.text || message.chat.type !== "private") return;
  const chatId = message.chat.id;
  const text = message.text.trim();

  if (await isTelegramAdmin(chatId)) {
    if (text.startsWith("/start")) {
      await sendTelegramText(chatId, "Подключено. Сюда приходят оплаты курсов с кнопками подтверждения.");
      await notifyUnsent();
    }
    return;
  }

  // Strangers get no reply at all. The only way in is the bind code while the seat is free.
  if (!text.startsWith("/start") || (await telegramAdminId()) !== null) return;
  const code = bindCode();
  if (!code || text.slice("/start".length).trim() !== code) return;
  if (!(await claimTelegramAdmin(chatId))) return;
  await sendTelegramText(chatId, "Готово. Бот закреплён за вами, другие люди его использовать не смогут. Сюда будут приходить оплаты курсов.");
  await notifyUnsent();
}

async function onCallback(query: NonNullable<TelegramUpdate["callback_query"]>): Promise<void> {
  if (!(await isTelegramAdmin(query.from.id))) {
    await answerTelegramCallback(query.id, "Нет доступа");
    return;
  }
  const match = /^(ok|no):([a-f0-9]{24})$/.exec(query.data ?? "");
  const id = match ? toObjectId(match[2]) : null;
  if (!match || !id) {
    await answerTelegramCallback(query.id, "Кнопка устарела");
    return;
  }
  const decision = match[1] === "ok" ? "confirmed" : "rejected";
  const result = await decidePayment(id, decision, "telegram");
  if (result === "missing") await answerTelegramCallback(query.id, "Заявка не найдена");
  else if (result === "done") await answerTelegramCallback(query.id, "Уже обработано");
  else await answerTelegramCallback(query.id, decision === "confirmed" ? "Курс открыт" : "Отклонено");
}
