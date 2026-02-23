import { mail_notify, slack_notifier } from "@/notifier.js";
import type { calendar_v3 } from "googleapis";

// NOTE: カレンダーからの予定の取得
async function getEventForCalender(calendar: calendar_v3.Calendar) {
	const GET_RANGE = 7;
	const start = new Date();
	const end = new Date();
	end.setDate(start.getDate() + GET_RANGE);

	const events = await calendar.events.list({
		calendarId: process.env.CALENDAR_ID,
		timeMin: start.toISOString(),
		timeMax: end.toISOString(),
		timeZone: "Asia/Tokyo",
		singleEvents: true,
		orderBy: "startTime",
	});
	return events.data.items;
}

// NOTE: 各イベントのテキストをCalendarEventから作成
export function createEventStr(e: calendar_v3.Schema$Event) {
	// 予定のタイトルを取得
	const title = e.summary;

	const isAllDayEvent = () => {
		if (e.start?.dateTime === undefined) {
			return true;
		}
		return false;
	};

	const getEventStr = () => {
		if (isAllDayEvent()) {
			return createAllDayEventStr(e);
		}
		return createTimeEventStr(e);
	};

	const eventStr = getEventStr();
	return `${eventStr}\n「${title}」`;
}

export function createAllDayEventStr(e: calendar_v3.Schema$Event) {
	// 予定の開始日・終了日を取得
	const startDate = new Date(e.start?.date as string);
	const endDate = new Date(e.end?.date as string);
	const duration = endDate.getDate() - startDate.getDate();
	// 1日以上の日程の場合
	if (duration > 1) {
		// MM/DD - MM/DD
		return `${startDate.getMonth() + 1}/${startDate.getDate()}-${endDate.getMonth() + 1}/${endDate.getDate()}`;
	}

	// MM/DD
	return `${startDate.getMonth() + 1}/${startDate.getDate()}`;
}

export function createTimeEventStr(e: calendar_v3.Schema$Event) {
	// 予定の開始時刻・終了時刻を取得
	const startDate = new Date(e.start?.dateTime as string);
	const endDate = new Date(e.end?.dateTime as string);

	// 書式変更(時間の0パディング)
	const startHour = startDate.getHours();
	const startMinute = startDate.getMinutes().toString().padStart(2, "0");

	const endHour = endDate.getHours();
	const endMinute = endDate.getMinutes().toString().padStart(2, "0");

	//　日を跨ぐ場合
	if (startDate.getDate() !== endDate.getDate()) {
		// MM/DD HH:MM - MM/DD HH:MM
		return `${startDate.getMonth() + 1}/${startDate.getDate()} ${startHour}:${startMinute} - ${endDate.getMonth() + 1}/${endDate.getDate()} ${endHour}:${endMinute}`;
	}
	// MM/DD HH:MM - HH:MM
	return `${startDate.getMonth() + 1}/${startDate.getDate()} ${startHour}:${startMinute} - ${endHour}:${endMinute}`;
}

export function createNotifySubject() {
	const endDate = new Date();
	endDate.setDate(endDate.getDate() + 7);

	// 当日の日付を整形
	const endDateStr = `${endDate.getMonth() + 1}/ ${endDate.getDate()}`;
	// メール件名
	const subject = `【リマインド】${endDateStr} までの予定`;
	return subject;
}

export function createNotifyBody(events: calendar_v3.Schema$Event[]) {
	const endDate = new Date();
	endDate.setDate(endDate.getDate() + 7);

	// 当日の日付を整形
	const endDateStr = `${endDate.getMonth() + 1}/${endDate.getDate()}`;

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
kanolab.share@gmail.com
`;

	// DEBUG
	console.log(body);

	return body;
}

// NOTE: スケジュール通知アプリのエントリーポイント
export async function scheduleNotify(calendar: calendar_v3.Calendar) {
	const events = await getEventForCalender(calendar);
	if (events === undefined) {
		console.error("events is undefined");
		return;
	}

	const subject = createNotifySubject();
	const body = createNotifyBody(events);
	console.log(body);

	const ADRESS = process.env.ADRESS as string;
	mail_notify(ADRESS, subject, body);

	// slackへの通知
	const CHANNEL_ID = process.env.EVENT_NOTIFY_CHANNEL_ID as string;
	slack_notifier.message(body, CHANNEL_ID);
}
