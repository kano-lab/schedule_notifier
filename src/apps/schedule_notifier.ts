import { CAL_ID, ADRESS, EVENT_NOTIFY_CHANNEL_ID } from "@/const.ts";
import { mail_notify, slack_notifier } from "@/notifier.ts";

// NOTE: カレンダーからの予定の取得
function getEventForCalender() {
  const calendar = CalendarApp.getCalendarById(CAL_ID);

  const GET_RANGE = 7;
  const start = new Date();
  const end = new Date();
  end.setDate(start.getDate() + GET_RANGE);

  const events = calendar.getEvents(start, end);
  return events;
}

// NOTE: 各イベントのテキストをCalendarEventから作成
function createEventStr(e: GoogleAppsScript.Calendar.CalendarEvent) {
  // 予定のタイトルを取得
  const title = e.getTitle();

  // 予定の開始時刻・終了時刻を取得
  const startTime = e.getStartTime();
  const endTime = e.getEndTime();

  // 書式変更(時間の0パディング)
  const startHour = e.getStartTime().getHours();
  const startMinute = e.getStartTime().getMinutes().toString().padStart(2, "0");

  const endHour = e.getEndTime().getHours();
  const endMinute = e.getEndTime().getMinutes().toString().padStart(2, "0");

  // 終日判定（時間が指定されている場合）
  if (!e.isAllDayEvent()) {
    // 1日以上の日程の場合
    if (
      startTime.getDate() !== endTime.getDate() ||
      startTime.getMonth() !== endTime.getMonth()
    ) {
      return `${startTime.getMonth() + 1}/${startTime.getDate()} ${startHour}:${startMinute}-${endTime.getMonth() + 1}/${endTime.getDate()} ${endHour}:${endMinute}\n 「${title}」`;
    } else {
      return `${startTime.getMonth() + 1}/${startTime.getDate()} ${startHour}:${startMinute}-${endHour}:${endMinute}\n 「${title}」`;
    }
    // 終日判定（時間が指定されていない場合）
  } else if (e.isAllDayEvent()) {
    // 1日以上の日程の場合
    if (
      startTime.getDate() !== endTime.getDate() ||
      startTime.getMonth() !== endTime.getMonth()
    ) {
      return `${startTime.getMonth() + 1}/${startTime.getDate()}-${endTime.getMonth() + 1}/${endTime.getDate()}\n 「${title}」`;
      // 開始日のみの表示
    } else {
      return `${startTime.getMonth() + 1}/${startTime.getDate()} \n「${title}」`;
    }
  }
}

function createNotifySubject() {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 7);

  // 当日の日付を整形
  const endDateStr = String(endDate.getMonth() + 1) + "/" + endDate.getDate();
  // メール件名
  const subject = "【リマインド】" + endDateStr + "までの予定";
  return subject;
}

function createNotifyBody(events: GoogleAppsScript.Calendar.CalendarEvent[]) {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 7);

  // 当日の日付を整形
  const endDateStr = String(endDate.getMonth() + 1) + "/" + endDate.getDate();

  // 予定がない場合はこの変数に格納されている文言で送信される
  let eventsStr = "今週の予定はありません";

  // map処理でeventsを指定のテンプレートの文字列の配列に変換し、
  // join処理で配列から文字列に変換（区切り文字を改行記号で指定）
  if (events.length !== 0) {
    eventsStr = events
      .map((e) => {
        return createEventStr(e);
      })
      .join("\n\n");
  }

  // メール本文
  // NOTE: 本文のインデントを変えると送信されるメールの本文まで変わるので注意！
  const body = `
お疲れ様です。kanolab 予定配信Bot です。
${endDateStr}までの予定を連絡させていただきます。

======

${eventsStr}

======

よろしくお願いいたします。

kanolab スケジュール配信Bot
kanolab.schedule.bot@gmail.com
`;

  // DEBUG
  console.log(body);

  return body;
}

// NOTE: スケジュール通知アプリのエントリーポイント
export function scheduleNotify() {
  // カレンダーからイベントを取得
  const events = getEventForCalender();

  // メール本文を作成
  const subject = createNotifySubject();
  const body = createNotifyBody(events);

  // メール送信
  mail_notify(ADRESS, subject, body);

  // slackへの通知
  slack_notifier.message(body, EVENT_NOTIFY_CHANNEL_ID);
}
