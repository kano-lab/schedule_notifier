import type { person_info } from "@/types.js";
import type { sheets_v4 } from "googleapis";
import { slack_notifier } from "@/notifier.js";
import { getAllWeekDates } from "@/utils.js";

const SHEET_NAME = "list";
const NUM_OF_PIC = 1;

type Member = {
	grade: string;
	name: string;
	slackId: string;
	canPic: boolean;
	count: number;
	rowIndex: number;
};

// NOTE: スプレッドシートの生データをMember型にマッピングする
export function parseMembers(rows: string[][]): Member[] {
	return rows.map((row, i) => ({
		grade: row[0],
		name: row[1],
		slackId: row[2],
		canPic: row[3].toLowerCase() === "true",
		count: Number(row[4]),
		rowIndex: i + 2, // header込みの行番号
	}));
}

// NOTE: 週の初め用の通知メッセージを作成する
export function createAssigneeStr(persons: person_info[]) {
	const mention = persons.map((d) => `<@${d.slack_id}> さん`).join("と");
	return `今週のゴミ捨て当番は ${mention} です`;
}

// NOTE: 当日の通知メッセージを作成する
export function createNotifyStr(persons: person_info[]) {
	const mention = persons.map((d) => `<@${d.slack_id}> さん`).join("と");
	return `${mention}! ゴミ捨ての時間です!`;
}

// NOTE: スプレッドシートからその週のゴミ捨て当番を取得する
async function getPersonInChargeOfGarbageDisposal(
	spreadsheet: sheets_v4.Sheets,
): Promise<person_info[]> {
	const SHEET_ID = process.env.SHEET_ID as string;

	const range = await spreadsheet.spreadsheets.values.get({
		spreadsheetId: SHEET_ID,
		range: SHEET_NAME,
	});
	const rows = range.data.values as string[][];
	if (!rows || rows.length <= 1) {
		throw new Error("データが取得できませんでした");
	}

	// ヘッダー行を除いてMember型にマッピング
	const members = parseMembers(rows.slice(1));

	// 割り当て可能なメンバーを回数昇順でソート
	const candidates = members
		.filter((m) => m.canPic)
		.sort((a, b) => a.count - b.count);

	// 回数が最小のメンバーから必要人数分を選出
	const assignees = candidates.slice(0, NUM_OF_PIC);

	// スプレッドシートの回数を更新
	for (const member of assignees) {
		await spreadsheet.spreadsheets.values.update({
			spreadsheetId: SHEET_ID,
			range: `${SHEET_NAME}!E${member.rowIndex}`,
			valueInputOption: "RAW",
			requestBody: {
				values: [[member.count + 1]],
			},
		});
	}

	return assignees.map((m) => ({ name: m.name, slack_id: m.slackId }));
}

// NOTE: ゴミ捨て通知アプリのエントリーポイント
export async function picNotify(spreadsheet: sheets_v4.Sheets) {
	// スプレッドシートからゴミ捨ての当番を取得
	const PIC_NOTIFY_CHANNEL_ID = process.env.PIC_NOTIFY_CHANNEL_ID as string;
	const person_data = await getPersonInChargeOfGarbageDisposal(spreadsheet);
	console.log(person_data);
	const assigneeStr = createAssigneeStr(person_data);
	console.log(assigneeStr);
	const result = slack_notifier.message(assigneeStr, PIC_NOTIFY_CHANNEL_ID);

	// 通知をスケジュールするための情報を取得 ex) 月曜日と木曜日の10:00
	const weekDates = getAllWeekDates();
	const scheduleHour = 10;
	const scheduleMinute = 0;

	const notifyStr = createNotifyStr(person_data);

	// NOTE: 月曜日と木曜日に通知する
	// ms単位を切り落としたものをUNIX時間に変換する
	const scheduleDates = [
		Math.floor(weekDates.monday.setHours(scheduleHour, scheduleMinute) / 1000),
		Math.floor(
			weekDates.thursday.setHours(scheduleHour, scheduleMinute) / 1000,
		),
	];

	const nowUnix = Math.floor(Date.now() / 1000);
	scheduleDates
		.filter((date) => {
			if (date <= nowUnix) {
				console.log(`スケジュール時刻 ${date} は過去のためスキップします`);
				return false;
			}
			return true;
		})
		.map((date) => {
			slack_notifier.scheduleMessage(
				notifyStr,
				PIC_NOTIFY_CHANNEL_ID,
				date,
				// @ts-ignore
				result.ts,
			);
		});
}
