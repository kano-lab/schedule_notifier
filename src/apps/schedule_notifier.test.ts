import { describe, expect, test } from "bun:test";
import type { calendar_v3 } from "googleapis";
import {
	createAllDayEventStr,
	createEventStr,
	createNotifyBody,
	createNotifySubject,
	createTimeEventStr,
} from "./schedule_notifier.js";

// ヘルパー: calendar_v3.Schema$Event の最小モック
function makeEvent(
	overrides: Partial<calendar_v3.Schema$Event>,
): calendar_v3.Schema$Event {
	return { summary: "テスト予定", ...overrides };
}

describe("createAllDayEventStr", () => {
	test("1日の終日イベント → MM/DD", () => {
		const e = makeEvent({
			start: { date: "2026-03-05" },
			end: { date: "2026-03-06" },
		});
		expect(createAllDayEventStr(e)).toBe("3/5");
	});

	test("複数日の終日イベント → MM/DD-MM/DD", () => {
		const e = makeEvent({
			start: { date: "2026-03-05" },
			end: { date: "2026-03-08" },
		});
		expect(createAllDayEventStr(e)).toBe("3/5-3/8");
	});
});

describe("createTimeEventStr", () => {
	test("同日の時間帯イベント → MM/DD HH:MM - HH:MM", () => {
		const e = makeEvent({
			start: { dateTime: "2026-03-05T09:00:00+09:00" },
			end: { dateTime: "2026-03-05T10:30:00+09:00" },
		});
		expect(createTimeEventStr(e)).toBe("3/5 9:00 - 10:30");
	});

	test("分の0パディング", () => {
		const e = makeEvent({
			start: { dateTime: "2026-03-05T09:05:00+09:00" },
			end: { dateTime: "2026-03-05T10:00:00+09:00" },
		});
		expect(createTimeEventStr(e)).toBe("3/5 9:05 - 10:00");
	});

	test("日跨ぎイベント → MM/DD HH:MM - MM/DD HH:MM", () => {
		const e = makeEvent({
			start: { dateTime: "2026-03-05T22:00:00+09:00" },
			end: { dateTime: "2026-03-06T02:00:00+09:00" },
		});
		expect(createTimeEventStr(e)).toBe("3/5 22:00 - 3/6 2:00");
	});
});

describe("createEventStr", () => {
	test("終日イベントの場合、日付とタイトルが出力される", () => {
		const e = makeEvent({
			summary: "合宿",
			start: { date: "2026-03-05" },
			end: { date: "2026-03-06" },
		});
		expect(createEventStr(e)).toBe('3/5\n「合宿」');
	});

	test("時間指定イベントの場合、時間帯とタイトルが出力される", () => {
		const e = makeEvent({
			summary: "ゼミ",
			start: { dateTime: "2026-03-05T13:00:00+09:00" },
			end: { dateTime: "2026-03-05T15:00:00+09:00" },
		});
		expect(createEventStr(e)).toBe('3/5 13:00 - 15:00\n「ゼミ」');
	});
});

describe("createNotifySubject", () => {
	test("件名に7日後の日付が含まれる", () => {
		const subject = createNotifySubject();
		expect(subject).toMatch(/^【リマインド】\d{1,2}\/ \d{1,2} までの予定$/);
	});
});

describe("createNotifyBody", () => {
	test("予定0件の場合、予定なしメッセージが含まれる", () => {
		const body = createNotifyBody([]);
		expect(body).toContain("今週の予定はありません");
	});

	test("予定がある場合、各イベントが本文に含まれる", () => {
		const events = [
			makeEvent({
				summary: "ゼミ",
				start: { dateTime: "2026-03-05T13:00:00+09:00" },
				end: { dateTime: "2026-03-05T15:00:00+09:00" },
			}),
			makeEvent({
				summary: "合宿",
				start: { date: "2026-03-07" },
				end: { date: "2026-03-09" },
			}),
		];
		const body = createNotifyBody(events);
		expect(body).toContain("「ゼミ」");
		expect(body).toContain("「合宿」");
		expect(body).not.toContain("今週の予定はありません");
	});

	test("本文にヘッダー・フッターが含まれる", () => {
		const body = createNotifyBody([]);
		expect(body).toContain("kanolab 予定配信Bot");
		expect(body).toContain("======");
	});
});
