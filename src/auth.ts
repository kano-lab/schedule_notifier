import { google } from "googleapis";
import type { Auth, calendar_v3, sheets_v4 } from "googleapis";

export function getAuth(): Auth.GoogleAuth {
	const auth = new google.auth.GoogleAuth({
		keyFile: "secret.json",
		scopes: [
			"https://www.googleapis.com/auth/calendar",
			"https://www.googleapis.com/auth/spreadsheets",
		],
		projectId: process.env.PROJECT_ID,
	});
	return auth;
}

export function getGoogleCalendar(auth: Auth.GoogleAuth): calendar_v3.Calendar {
	const calendar = google.calendar({
		version: "v3",
		auth: auth,
	});
	return calendar;
}

export function getGoogleSpreadsheet(auth: Auth.GoogleAuth): sheets_v4.Sheets {
	const sheets = google.sheets({
		version: "v4",
		auth: auth,
	});
	return sheets;
}
