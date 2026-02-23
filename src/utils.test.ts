import { describe, expect, test } from "bun:test";
import { getAllWeekDates } from "./utils.js";

describe("getAllWeekDates", () => {
	test("日曜日を起点に7日分の日付が返される", () => {
		// 2026-02-22 (日曜日)
		const sunday = new Date(2026, 1, 22);
		const result = getAllWeekDates(sunday);

		expect(result.sunday.getDate()).toBe(22);
		expect(result.monday.getDate()).toBe(23);
		expect(result.tuesday.getDate()).toBe(24);
		expect(result.wednesday.getDate()).toBe(25);
		expect(result.thursday.getDate()).toBe(26);
		expect(result.friday.getDate()).toBe(27);
		expect(result.saturday.getDate()).toBe(28);
	});

	test("水曜日を起点にした場合、水〜火の7日分が返される", () => {
		// 2026-02-25 (水曜日)
		const wednesday = new Date(2026, 1, 25);
		const result = getAllWeekDates(wednesday);

		expect(result.wednesday.getDate()).toBe(25);
		expect(result.thursday.getDate()).toBe(26);
		expect(result.friday.getDate()).toBe(27);
		expect(result.saturday.getDate()).toBe(28);
		expect(result.sunday.getDate()).toBe(1); // 3月1日
		expect(result.monday.getDate()).toBe(2);
		expect(result.tuesday.getDate()).toBe(3);
	});

	test("月跨ぎでも正しい日付が返される", () => {
		// 2026-02-28 (土曜日) → 3月に跨ぐ
		const saturday = new Date(2026, 1, 28);
		const result = getAllWeekDates(saturday);

		expect(result.saturday.getMonth()).toBe(1); // 2月
		expect(result.sunday.getMonth()).toBe(2); // 3月
		expect(result.sunday.getDate()).toBe(1);
	});

	test("時刻が00:00:00にリセットされる", () => {
		const dateWithTime = new Date(2026, 1, 22, 15, 30, 45);
		const result = getAllWeekDates(dateWithTime);

		for (const date of Object.values(result)) {
			expect(date.getHours()).toBe(0);
			expect(date.getMinutes()).toBe(0);
			expect(date.getSeconds()).toBe(0);
			expect(date.getMilliseconds()).toBe(0);
		}
	});

	test("引数なしで呼び出してもエラーにならない", () => {
		expect(() => getAllWeekDates()).not.toThrow();
		const result = getAllWeekDates();
		expect(Object.keys(result)).toHaveLength(7);
	});
});
