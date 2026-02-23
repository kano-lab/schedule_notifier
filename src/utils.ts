type DayOfWeek =
	| "monday"
	| "tuesday"
	| "wednesday"
	| "thursday"
	| "friday"
	| "saturday"
	| "sunday";
type WeekDates = { [key in DayOfWeek]: Date };

// NOTE: 今週の日付を取得する関数
// 各時間はmsを切り捨てたUNIX時間で返却される
export function getAllWeekDates(date = new Date()) {
	date.setHours(0, 0, 0, 0);

	const weekDates = {} as WeekDates;
	const dayNames: DayOfWeek[] = [
		"sunday",
		"monday",
		"tuesday",
		"wednesday",
		"thursday",
		"friday",
		"saturday",
	];

	for (let i = 0; i < 7; i++) {
		const currentDate = new Date(date);
		currentDate.setDate(date.getDate() + i);
		weekDates[dayNames[currentDate.getDay()]] = currentDate;
	}
	return weekDates;
}
