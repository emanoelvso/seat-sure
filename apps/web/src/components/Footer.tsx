import { MicrophoneIcon } from "@solar-icons/react/outline";
import { Lobster } from "next/font/google";
import Link from "next/link";
import FacebookIcon from "./icons/FacebookIcon";
import InstagramIcon from "./icons/InstagramIcon";
import LinkedinIcon from "./icons/LinkedinIcon";
import YoutubeIcon from "./icons/YoutubeIcon";
import TelegramIcon from "./icons/TelegramIcon";

const lobster = Lobster({
  subsets: ["latin"],
  weight: "400",
});

export default function Footer() {
  return (
    <footer className="flex flex-col items-center justify-center">
      <Link
        href=""
        className="flex gap-2 text-primary items-center mb-[2.625rem]"
      >
        <MicrophoneIcon />
        <span className={`${lobster.className} text-[2.5rem]`}>Evenjo</span>
      </Link>

      <nav className="flex gap-10 text-white text-base mb-[2.625rem]">
        <Link href="">Home</Link>
        <Link href="">Contact us</Link>
        <Link href="">About us</Link>
        <Link href="">Privacy Policy</Link>
      </nav>

      <div className="flex gap-8 mb-[2.625rem]">
        <a href="">
          <FacebookIcon />
        </a>
        <a href="">
          <InstagramIcon />
        </a>
        <a href="">
          <LinkedinIcon />
        </a>
        <a href="">
          <YoutubeIcon />
        </a>
        <a href="">
          <TelegramIcon />
        </a>
      </div>

      <hr className="border-white/20 self-stretch mx-[111px] mb-[2rem]" />

      <p className="text-sm">Copyright Evenjo</p>
    </footer>
  );
}
