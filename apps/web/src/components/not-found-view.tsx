import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/layouts/header";
import { buttonVariants } from "@/components/ui/button";
import { paths } from "@/config/paths";

export function NotFoundView() {
  return (
    <div className="relative flex min-h-screen flex-1 flex-col overflow-hidden">
      <Image
        src="/not-found/background.jpg"
        alt=""
        fill
        preload
        sizes="100vw"
        className="object-cover object-bottom"
      />

      <Header transparent />

      <main className="relative z-10 flex flex-col items-center gap-6 pt-25.5 text-center">
        <h1 className="max-w-141 text-h5 font-bold text-neutral-100">
          Oops! The page you&apos;re looking for doesn&apos;t exist or may have
          been moved.
        </h1>
        <Link
          href={paths.home.getHref()}
          className={buttonVariants({ size: "lg" })}
        >
          Back to Homepage
        </Link>
        <p
          aria-hidden="true"
          className="mt-8.5 text-display font-bold text-white"
        >
          404
        </p>
      </main>
    </div>
  );
}
