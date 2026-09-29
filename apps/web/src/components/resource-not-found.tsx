import Link from "next/link";

interface ResourceNotFoundProps {
  title: string;
}

export function ResourceNotFound({ title }: ResourceNotFoundProps) {
  return (
    <>
      <h1 className="text-4xl font-bold">{title}</h1>
      <Link href="/events" className="text-primary hover:text-tint-400">
        Browse events
      </Link>
    </>
  );
}
