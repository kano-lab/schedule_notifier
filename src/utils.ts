// 現在の年度を取得する関数
const getYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return month >= 3 ? year : year - 1;
};

export const getYearStr = () => {
  return getYear().toString();
};

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
type WeekDates = { [key in DayOfWeek]: Date };

// NOTE: 今週の日付を取得する関数
// 各時間はmsを切り捨てたUNIX時間で返却される
export function getAllWeekDates(date = new Date(2024, 6, 6)): WeekDates {
  date.setHours(0, 0, 0, 0);
  console.log(date);
  const currentDay: number = date.getDay();
  const diff: number = date.getDate() - currentDay;
  const weekDates: WeekDates = {} as WeekDates;
  const dayNames: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  for (let i = 0; i < 7; i++) {
    const currentDate: Date = new Date(date);
    currentDate.setDate(diff + i);
    weekDates[dayNames[i]] = currentDate;
  }

  return weekDates;
}
