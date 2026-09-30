import { DateRange } from "react-day-picker";
import { format, isSameDay } from "date-fns";

export function formatDateLabel(value: DateRange | undefined) {
  if (!value?.from) return "Select dates";
  if (!value.to) return format(value.from, "MMM d, yyyy");
  if (isSameDay(value.to, value.from)) return format(value.from, "MMM d, yyyy");

  return `${format(value.from, "MMM d")} - ${format(value.to, "MMM d, yyyy")}`;
}
