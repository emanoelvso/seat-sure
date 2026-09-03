import { Lobster } from "next/font/google";
import Link from "next/link";
import Button from "./Button";
import UsaIcon from "./icons/UsaIcon";
import { AltArrowDownIcon, ArrowDownIcon } from "@solar-icons/react/outline";
const lobster = Lobster({
  weight: "400",
  subsets: ["latin"],
});

export default function Header() {
  return (
    <header className="flex items-center justify-between">
      <Link
        href=""
        className={`${lobster.className} text-[2.5rem] text-primary`}
      >
        Evenjo
      </Link>

      <nav>
        <ul className="flex gap-10">
          <li>
            <Link
              href=""
              className="text-neutral-200 hover:text-white transition duration-700 px-4 py-1.5 rounded-full relative group isolate"
            >
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2  duration-700 w-8 h-6 blur-[12px] bg-zinc-700 opacity-0 group-hover:opacity-100 transition -z-10"></div>
              <div className="absolute -top-5 left-1/2 -translate-x-1/2  duration-700 w-8 h-6 blur-[12px] bg-zinc-700 opacity-0 group-hover:opacity-100 transition -z-10"></div>
              Home
            </Link>
          </li>
          <li>
            <Link
              href=""
              className="text-neutral-200 hover:text-white transition duration-700 px-4 py-1.5 rounded-full relative group isolate"
            >
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2  duration-700 w-8 h-6 blur-[12px] bg-zinc-700 opacity-0 group-hover:opacity-100 transition -z-10"></div>
              <div className="absolute -top-5 left-1/2 -translate-x-1/2  duration-700 w-8 h-6 blur-[12px] bg-zinc-700 opacity-0 group-hover:opacity-100 transition -z-10"></div>
              Shows
            </Link>
          </li>
          <li>
            <Link
              href=""
              className="text-neutral-200 hover:text-white transition duration-700 px-4 py-1.5 rounded-full relative group isolate"
            >
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2  duration-700 w-8 h-6 blur-[12px] bg-zinc-700 opacity-0 group-hover:opacity-100 transition -z-10"></div>
              <div className="absolute -top-5 left-1/2 -translate-x-1/2  duration-700 w-8 h-6 blur-[12px] bg-zinc-700 opacity-0 group-hover:opacity-100 transition -z-10"></div>
              Concerts
            </Link>
          </li>
          <li>
            <Link
              href=""
              className="text-neutral-200 hover:text-white transition duration-700 px-4 py-1.5 rounded-full relative group isolate"
            >
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2  duration-700 w-8 h-6 blur-[12px] bg-zinc-700 opacity-0 group-hover:opacity-100 transition -z-10"></div>
              <div className="absolute -top-5 left-1/2 -translate-x-1/2  duration-700 w-8 h-6 blur-[12px] bg-zinc-700 opacity-0 group-hover:opacity-100 transition -z-10"></div>
              Sports
            </Link>
          </li>
          <li>
            <Link
              href=""
              className="text-neutral-200 hover:text-white transition duration-700 px-4 py-1.5 rounded-full relative group isolate"
            >
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2  duration-700 w-8 h-6 blur-[12px] bg-zinc-700 opacity-0 group-hover:opacity-100 transition -z-10"></div>
              <div className="absolute -top-5 left-1/2 -translate-x-1/2  duration-700 w-8 h-6 blur-[12px] bg-zinc-700 opacity-0 group-hover:opacity-100 transition -z-10"></div>
              Festivals
            </Link>
          </li>
        </ul>
      </nav>

      <div className="flex items-center gap-3">
        <button className="flex items-center gap-1">
          <UsaIcon />
          <span>Eng</span>
          <AltArrowDownIcon />
        </button>
        <Button text="Signup" />
      </div>
    </header>
  );
}
