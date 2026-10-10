import Link from "next/link";
import { PageMessage } from "@/components/layouts/page-message";

interface ResourceNotFoundProps {
  title: string;
}

export function ResourceNotFound({ title }: ResourceNotFoundProps) {
  return (
    <PageMessage>
      <h1 className="text-4xl font-bold">{title}</h1>
      <Link href="/events" className="text-tint-500 hover:text-tint-400">
        Browse events
      </Link>
    </PageMessage>
  );
}
