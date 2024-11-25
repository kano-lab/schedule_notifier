import type { person_info } from "@/types.js";
import type { sheets_v4 } from "googleapis";
import { slack_notifier } from "@/notifier.js";
import { getYearStr, getAllWeekDates } from "@/utils.js";

type poc_data = [
  `${number}`,
  string,
  string,
  string,
  string,
  `${boolean}`,
  `${number}`,
];
type poc_data_list = poc_data[];

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
  return `${assigneeStr}! ゴミ捨ての時間です!`;
}

// NOTE: スプレッドシートからその週のゴミ捨て当番を取得する
async function getPersonInChargeOfGarbageDisposal(
  spreadsheet: sheets_v4.Sheets,
): Promise<person_info[]> {
  const NUM_OF_PIC = 1;
  const SHEET_ID = process.env.SHEET_ID as string;
  const sheetName = getYearStr();
  const sheet = await spreadsheet.spreadsheets.get({
    spreadsheetId: SHEET_ID,
    ranges: [sheetName],
    includeGridData: true,
  });
  if (!sheet) {
    throw new Error("シートが見つかりませんでした");
  }

  // 全てのデータの取得
  const range = await spreadsheet.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: sheetName,
  });
  const values: poc_data_list = range.data.values as poc_data_list;
  console.log(values);
  if (!values) {
    throw new Error("データが取得できませんでした");
  }

  // indexを削除
  values.shift();

  // 指定したセル範囲を取得する
  //@ts-ignore
  const valueList = values.map((item) => {
    return Number(item[6]);
  });

  // 最小値を取得する
  let minValue = Math.min(...valueList);
  console.log(minValue);
  const person_data: person_info[] = [];
  while (person_data.length < NUM_OF_PIC) {
    values.map((item: poc_data, index: number) => {
      console.log(item);
      //const index: number = item[0];
      //const grade: string = item[1];
      const name: string = item[2];
      //const charge: string = item[3];
      const slack_id: string = item[4];
      const canPic = Boolean(item[5]);
      const count = Number(item[6]);
      if (count === minValue && person_data.length !== NUM_OF_PIC) {
        // NOTE: nameからspreadsheetを検索して、countをupdateする
        spreadsheet.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          // NOTE: header込みのindexを指定する
          range: `${sheetName}!G${index + 2}`,
          valueInputOption: "RAW",
          requestBody: {
            values: [[count + 1]],
          },
        });
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
export async function picNotify(spreadsheet: sheets_v4.Sheets) {
  // スプレッドシートからゴミ捨ての当番を取得
  const PIC_NOTIFY_CHANNEL_ID = process.env.PIC_NOTIFY_CHANNEL_ID as string;
  const person_data = await getPersonInChargeOfGarbageDisposal(spreadsheet);
  const assigneeStr = createAssigneeStr(person_data);
  console.log(assigneeStr);
  const result = slack_notifier.message(assigneeStr, PIC_NOTIFY_CHANNEL_ID);

  // 通知をスケジュールするための情報を取得 ex) 月曜日と木曜日の10:00
  const weekDates = getAllWeekDates();
  const scheduleHour = 10;
  const scheduleMinute = 0;

  const notifyStr = createNotifyStr(person_data);

  // NOTE: 月曜日と木曜日に通知する
  // ms単位を切り落としたものをUNIX時間に変換する
  const scheduleDates = [
    Math.floor(weekDates.monday.setHours(scheduleHour, scheduleMinute) / 1000),
    Math.floor(
      weekDates.thursday.setHours(scheduleHour, scheduleMinute) / 1000,
    ),
  ];

  scheduleDates.map((date) => {
    slack_notifier.scheduleMessage(
      notifyStr,
      PIC_NOTIFY_CHANNEL_ID,
      date,
      // @ts-ignore
      result.ts,
    );
  });
}
