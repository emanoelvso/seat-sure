import Link from "next/link";
import { AltArrowLeftIcon, AltArrowRightIcon } from "@solar-icons/react/outline";
import type { Icon } from "@solar-icons/react/lib/types";

interface PaginationProps {
  page: number;
  totalPages: number;
  getHref: (page: number) => string;
}

const ARROW_CLASS =
  "flex size-8 items-center justify-center rounded-full bg-neutral-900 p-1";

function ArrowControl({
  label,
  icon: ArrowIcon,
  href,
}: {
  label: string;
  icon: Icon;
  href: string | null;
}) {
  if (href === null) {
    return (
      <span
        role="link"
        aria-disabled="true"
        aria-label={label}
        className={`${ARROW_CLASS} text-neutral-300`}
      >
        <ArrowIcon size={16} />
      </span>
    );
  }

  return (
    <Link href={href} aria-label={label} className={`${ARROW_CLASS} text-white`}>
      <ArrowIcon size={16} />
    </Link>
  );
}

// Links pagination (ORDLIST-05): previous, numbered pages and next. The
// current page carries aria-current="page"; the arrows are disabled at the
// ends. A single page renders nothing.
export function Pagination({ page, totalPages, getHref }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <nav aria-label="Pagination">
      <ul className="flex items-center gap-2">
        <li>
          <ArrowControl
            label="Previous page"
            icon={AltArrowLeftIcon}
            href={page > 1 ? getHref(page - 1) : null}
          />
        </li>
        <li>
          <ul className="flex items-center gap-2 rounded-2xl bg-neutral-900">
            {pages.map((pageNumber) => {
              const current = pageNumber === page;
              return (
                <li key={pageNumber}>
                  <Link
                    href={getHref(pageNumber)}
                    aria-current={current ? "page" : undefined}
                    className={`flex size-8 items-center justify-center rounded-full text-sm ${
                      current ? "bg-primary text-white" : "text-neutral-200"
                    }`}
                  >
                    {pageNumber}
                  </Link>
                </li>
              );
            })}
          </ul>
        </li>
        <li>
          <ArrowControl
            label="Next page"
            icon={AltArrowRightIcon}
            href={page < totalPages ? getHref(page + 1) : null}
          />
        </li>
      </ul>
    </nav>
  );
}
