// Description: This file is the entry point of the application.
import { scheduleNotify } from "@/apps/schedule_notifier";
import { picNotify } from "@/apps/pic_of_garbage_disposal_notifier";

export function _scheduleNotifyHandler() {
  scheduleNotify();
}

export function _garbageDisposalNotifyHandler() {
  picNotify();
}
