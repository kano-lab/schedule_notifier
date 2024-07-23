import { SLACK_OAUTH_TOKEN } from "@/const";

export function mail_notify(
  address: string,
  subject: string,
  bodyForMail: string,
) {
  console.log(`send mail to ${address}`);
  // メール送信
  GmailApp.sendEmail(address, subject, bodyForMail);
}

export const slack_notifier = {
  message: slackMessage,
  scheduleMessage: slackScheduleMessage,
};

type slackPayload = {
  channel: string;
  text: string;
  post_at?: number;
  thread_ts?: number;
};

function slackMessage(message: string, channelId: string, thread_ts?: number) {
  const url = "https://slack.com/api/chat.postMessage";
  const result = fetchSlackAPI(url, message, channelId, undefined, thread_ts);
  return result;
}

// NOTE:postAtはUNIX時間で指定する
function slackScheduleMessage(message: string, channelId: string, postAt: number, thread_ts?: number) {
  const url = "https://slack.com/api/chat.scheduleMessage"
  const result = fetchSlackAPI(url, message, channelId, postAt, thread_ts);
  return result;
}

function fetchSlackAPI(url: string, message: string, channelId: string, postAt?: number, thread_ts?: number) {
  console.log(`send slack message to ${channelId}`);
  const token = SLACK_OAUTH_TOKEN;
  const payload: slackPayload = {
    "channel": channelId,
    "text": message,
  };

  if (postAt) {
    payload.post_at = postAt;
  }
  if (thread_ts) {
    payload.thread_ts = thread_ts;
  }

  console.log(payload);
  console.log(JSON.stringify(payload));

  const result = UrlFetchApp.fetch(url, {
    "method": "post",
    "contentType": "application/json; charset=utf-8",
    "headers": { "Authorization": "Bearer " + token },
    "payload": JSON.stringify(payload)
  }
  )

  const resultContent = result.getContentText();

  // DEBUG
  console.log(resultContent);
  if (resultContent == "false") {
    throw new Error("slackへのメッセージ送信に失敗しました");
  }
  return JSON.parse(resultContent);
}


