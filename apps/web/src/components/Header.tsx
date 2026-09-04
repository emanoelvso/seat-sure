import { Lobster } from "next/font/google";
import Link from "next/link";
import Button from "./Button";
import UsaIcon from "./icons/UsaIcon";
import {
  AltArrowDownIcon,
  BellIcon,
  MagnifierIcon,
} from "@solar-icons/react/outline";
import Image from "next/image";
import Input from "./Input";
const lobster = Lobster({
  weight: "400",
  subsets: ["latin"],
});

interface HeaderProps {
  avatarUrl?: string;
  searchMode?: boolean;
}

export default function Header({ avatarUrl, searchMode = false }: HeaderProps) {
  return (
    <header
      className={`flex items-center justify-between ${searchMode && "bg-neutral-1000 py-5 px-6 rounded-xl"}`}
    >
      {searchMode ? (
        <Input />
      ) : (
        <>
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
        </>
      )}
      <div className="flex items-center gap-3">
        {avatarUrl && (
          <div
            className={
              searchMode
                ? "bg-neutral-700 rounded-full w-10 h-10 overflow-hidden shrink-0 flex items-center justify-center"
                : ""
            }
          >
            <BellIcon />
          </div>
        )}
        <button className="flex items-center gap-1">
          <UsaIcon />
          <span>Eng</span>
          <AltArrowDownIcon />
        </button>
        {avatarUrl ? (
          <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
            <Image
              className="object-cover w-full h-full"
              src={avatarUrl}
              alt="Profile Avatar"
              width={40}
              height={40}
            />
          </div>
        ) : (
          <Button text="Signup" />
        )}
      </div>
    </header>
  );
}
