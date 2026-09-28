import { scheduleNotify } from "@/apps/schedule_notifier.js";
import { picNotify } from "@/apps/pic_of_garbage_disposal_notifier.js";
import { getAuth, getGoogleCalendar, getGoogleSpreadsheet } from "@/auth.js";
import { config } from "dotenv";

async function main() {
	config();
	const auth = getAuth();
	const calendar = getGoogleCalendar(auth);
	const spreadsheet = getGoogleSpreadsheet(auth);

	// NOTE: 予定通知と当番通知は互いに独立しているため、両方の完了を待ってから失敗を報告する
	const results = await Promise.allSettled([
		scheduleNotify(calendar),
		picNotify(spreadsheet),
	]);
	const errors = results
		.filter((r) => r.status === "rejected")
		.map((r) => r.reason);
	if (errors.length > 0) {
		throw new AggregateError(errors, "通知処理に失敗しました");
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
