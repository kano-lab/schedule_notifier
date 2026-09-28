import {
	afterEach,
	beforeEach,
	describe,
	expect,
	mock,
	setSystemTime,
	spyOn,
	test,
} from "bun:test";
import type { sheets_v4 } from "googleapis";
import { slack_notifier } from "@/notifier.js";
import {
	createAssigneeStr,
	createNotifyStr,
	parseMembers,
	picNotify,
} from "./pic_of_garbage_disposal_notifier.js";

describe("parseMembers", () => {
	test("行データからMember型に正しく変換される", () => {
		const rows = [["M2", "田中", "U12345", "true", "3"]];
		const members = parseMembers(rows);

		expect(members).toHaveLength(1);
		expect(members[0]).toEqual({
			grade: "M2",
			name: "田中",
			slackId: "U12345",
			canPic: true,
			count: 3,
			rowIndex: 2,
		});
	});

	test("複数行のデータでrowIndexが正しく計算される", () => {
		const rows = [
			["M2", "田中", "U12345", "true", "3"],
			["M1", "鈴木", "U67890", "false", "1"],
			["B4", "佐藤", "U11111", "true", "5"],
		];
		const members = parseMembers(rows);

		expect(members).toHaveLength(3);
		expect(members[0].rowIndex).toBe(2);
		expect(members[1].rowIndex).toBe(3);
		expect(members[2].rowIndex).toBe(4);
	});

	test("canPicがtrue/falseに正しく変換される", () => {
		const rows = [
			["M2", "田中", "U12345", "true", "3"],
			["M1", "鈴木", "U67890", "false", "1"],
		];
		const members = parseMembers(rows);

		expect(members[0].canPic).toBe(true);
		expect(members[1].canPic).toBe(false);
	});

	test("countが数値に正しく変換される", () => {
		const rows = [["M2", "田中", "U12345", "true", "10"]];
		const members = parseMembers(rows);

		expect(members[0].count).toBe(10);
	});
});

describe("createAssigneeStr", () => {
	test("1人の場合のメンション文字列", () => {
		const persons = [{ name: "田中", slack_id: "U12345" }];
		const result = createAssigneeStr(persons);

		expect(result).toBe("今週のゴミ捨て当番は <@U12345> さん です");
	});

	test("複数人の場合、「と」で結合される", () => {
		const persons = [
			{ name: "田中", slack_id: "U12345" },
			{ name: "鈴木", slack_id: "U67890" },
		];
		const result = createAssigneeStr(persons);

		expect(result).toBe(
			"今週のゴミ捨て当番は <@U12345> さんと<@U67890> さん です",
		);
	});
});

describe("createNotifyStr", () => {
	test("1人の場合の通知文字列", () => {
		const persons = [{ name: "田中", slack_id: "U12345" }];
		const result = createNotifyStr(persons);

		expect(result).toBe("<@U12345> さん! ゴミ捨ての時間です!");
	});

	test("複数人の場合、「と」で結合される", () => {
		const persons = [
			{ name: "田中", slack_id: "U12345" },
			{ name: "鈴木", slack_id: "U67890" },
		];
		const result = createNotifyStr(persons);

		expect(result).toBe(
			"<@U12345> さんと<@U67890> さん! ゴミ捨ての時間です!",
		);
	});
});

describe("picNotify", () => {
	const assigneeMessageTs = "1790000000.000100";
	const spreadsheet = {
		spreadsheets: {
			values: {
				get: async () => ({
					data: {
						values: [
							["学年", "名前", "SlackID", "当番可否", "回数"],
							["M2", "田中", "U12345", "true", "3"],
						],
					},
				}),
				update: async () => ({}),
			},
		},
	} as unknown as sheets_v4.Sheets;

	beforeEach(() => {
		process.env.SHEET_ID = "test-sheet";
		process.env.PIC_NOTIFY_CHANNEL_ID = "C_TEST";
		// 日曜 07:00 に実行した想定。月曜・木曜の 10:00 がどちらも未来になる
		setSystemTime(new Date("2026-09-27T07:00:00+09:00"));
		spyOn(slack_notifier, "message").mockResolvedValue({
			ok: true,
			ts: assigneeMessageTs,
		});
	});

	afterEach(() => {
		mock.restore();
		setSystemTime();
	});

	test("予約投稿が当番通知のスレッドに付く", async () => {
		const scheduleMessage = spyOn(
			slack_notifier,
			"scheduleMessage",
		).mockResolvedValue({ ok: true });

		await picNotify(spreadsheet);

		expect(scheduleMessage).toHaveBeenCalledTimes(2);
		for (const call of scheduleMessage.mock.calls) {
			expect(call[3]).toBe(assigneeMessageTs);
		}
	});

	test("予約投稿に失敗した場合はエラーになる", async () => {
		spyOn(slack_notifier, "scheduleMessage").mockRejectedValue(
			new Error("Failed to send slack message: invalid_time"),
		);

		await expect(picNotify(spreadsheet)).rejects.toThrow("invalid_time");
	});
});
