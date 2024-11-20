import { scheduleNotify } from "@/apps/schedule_notifier.js";
import { picNotify } from "@/apps/pic_of_garbage_disposal_notifier.js";
import { getAuth, getGoogleCalendar, getGoogleSpreadsheet } from "@/auth.js";
import { config } from "dotenv";

function main() {
	config();
	const auth = getAuth();
	const calendar = getGoogleCalendar(auth);
	const spreadsheet = getGoogleSpreadsheet(auth);
	scheduleNotify(calendar);
	picNotify(spreadsheet);
}

main();
