import { DateRange } from "react-day-picker";
import { format } from "date-fns";

export default function formatLabel(value: DateRange | undefined) {
  if (!value?.from) return "Select dates";
  if (!value.to) return format(value.from, "MMM d, yyyy");
  if (value.to === value.from) return format(value.from, "MMM d, yyyy");

  return `${format(value.from, "MMM d")} - ${format(value.to, "MMM d, yyyy")}`;
}
