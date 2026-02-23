import { describe, expect, test } from "bun:test";
import {
	createAssigneeStr,
	createNotifyStr,
	parseMembers,
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
