import { createTransport } from "nodemailer";

export async function mail_notify(
	address: string,
	subject: string,
	bodyForMail: string,
) {
	console.log(`send mail to ${address}`);
	const transporter = createTransport({
		host: "smtp.gmail.com",
		port: 587,
		secure: false,
		auth: {
			user: process.env.MAIL_USER,
			pass: process.env.MAIL_PASSWORD,
		},
	});

	const info = await transporter.sendMail({
		from: `"狩野研究室 予定通知Bot" <${process.env.MAIL_USER}>`,
		to: address,
		subject: subject,
		text: bodyForMail,
	});

	console.log("Message sent: %s", info.messageId);
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
function slackScheduleMessage(
	message: string,
	channelId: string,
	postAt: number,
	thread_ts?: number,
) {
	const url = "https://slack.com/api/chat.scheduleMessage";
	const result = fetchSlackAPI(url, message, channelId, postAt, thread_ts);
	return result;
}

async function fetchSlackAPI(
	url: string,
	message: string,
	channelId: string,
	postAt?: number,
	thread_ts?: number,
) {
	console.log(`send slack message to ${channelId}`);
	const token = process.env.SLACK_OAUTH_TOKEN;
	const payload: slackPayload = {
		channel: channelId,
		text: message,
	};

	if (postAt) {
		payload.post_at = postAt;
	}
	if (thread_ts) {
		payload.thread_ts = thread_ts;
	}

	console.log(JSON.stringify(payload));

	const result = await fetch(url, {
		method: "post",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(payload),
	}).then((res) => res.json());

	const ok = result.ok;
	if (!ok) {
		throw new Error(`Failed to send slack message: ${result.error}`);
	}
	return result;
}
