import type { person_info } from "@/types.ts";
import { SHEET_ID, PIC_NOTIFY_CHANNEL_ID } from "@/const.ts";
import { slack_notifier } from "@/notifier.ts";
import { getYearStr, getAllWeekDates } from "@/utils.ts";

// NOTE: 週の初め用の通知メッセージを作成する
function createAssigneeStr(person_data: person_info[]) {
  const assigneeStr = person_data
    .map((d: person_info) => {
      return `<@${d.slack_id}> さん`;
    })
    .join("と");
  return `今週のゴミ捨て当番は ${assigneeStr} です`;
}

// NOTE: 当日の通知メッセージを作成する
function createNotifyStr(person_data: person_info[]) {
  const assigneeStr = person_data
    .map((d: person_info) => {
      return `<@${d.slack_id}> さん`;
    })
    .join("と");
  console.log(assigneeStr);
  return `${assigneeStr}! ゴミ捨ての時間です!`;
}


// NOTE: スプレッドシートからその週のゴミ捨て当番を取得する
function getPersonInChargeOfGarbageDisposal(): person_info[] {
  const NUM_OF_PIC = 1;
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  const sheetName = getYearStr();
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error("シートが見つかりませんでした");
  }

  // 全てのデータの取得
  const range = spreadsheet.getDataRange();
  const values = range.getValues();

  //シート最終行の値を取得する
  const lastRow = sheet.getLastRow();

  // 指定したセル範囲を取得する
  const valueList = sheet.getRange(1, 7, lastRow).getValues().flat();
  valueList.shift();
  console.log(valueList)

  const aryMin = (a: number, b: number) => Math.min(a, b);
  let minValue = valueList.reduce(aryMin);
  if (isNaN(minValue)) {
    throw new Error("minValueが取得できませんでした");
  }
  console.log("minValue: ", minValue)

  const person_data: person_info[] = [];
  while (person_data.length < NUM_OF_PIC) {
    values.map((item, index) => {
      console.log(item);
      //const index: number = item[0];
      //const grade: string = item[1];
      const name: string = item[2];
      //const charge: string = item[3];
      const slack_id: string = item[4];
      const canPic = item[5];
      const count: string = item[6];
      if (count == minValue && person_data.length !== NUM_OF_PIC) {
        // NOTE: nameからspreadsheetを検索して、countをupdateする
        sheet.getRange(`G${index + 1}`).setValue(Number(count) + 1);
        // NOTE: ゴミ捨ての割り当てが可能な場合、person_dataに追加する
        if (canPic) {
          person_data.push({ name, slack_id });
        }
      }
    });
    minValue += 1;
  }

  // DEBUG
  console.log(person_data);
  return person_data;
}

// NOTE: ゴミ捨て通知アプリのエントリーポイント
export function picNotify() {
  // スプレッドシートからゴミ捨ての当番を取得
  const person_data = getPersonInChargeOfGarbageDisposal();
  const assigneeStr = createAssigneeStr(person_data);
  const result = slack_notifier.message(assigneeStr, PIC_NOTIFY_CHANNEL_ID);

  // 通知をスケジュールするための情報を取得 ex) 月曜日と木曜日の10:00
  const weekDates = getAllWeekDates();
  const scheduleHour = 10
  const scheduleMinute = 0

  const notifyStr = createNotifyStr(person_data);
  // NOTE: 月曜日と木曜日に通知する
  // ms単位を切り落としたものをUNIX時間に変換する
  const scheduleDates = [
    Math.floor(weekDates.monday.setHours(scheduleHour, scheduleMinute) / 1000),
    Math.floor(weekDates.thursday.setHours(scheduleHour, scheduleMinute) / 1000),
  ];
  scheduleDates.map((date) => {
    slack_notifier.scheduleMessage(notifyStr, PIC_NOTIFY_CHANNEL_ID, date, result.ts);
  });
}
