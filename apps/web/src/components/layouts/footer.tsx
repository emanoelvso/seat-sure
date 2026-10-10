import { MicrophoneIcon } from "@solar-icons/react/outline";
import { Lobster } from "next/font/google";
import Link from "next/link";
import { FacebookIcon } from "@/components/icons/facebook-icon";
import { InstagramIcon } from "@/components/icons/instagram-icon";
import { LinkedinIcon } from "@/components/icons/linkedin-icon";
import { YoutubeIcon } from "@/components/icons/youtube-icon";
import { TelegramIcon } from "@/components/icons/telegram-icon";
import { paths } from "@/config/paths";

const lobster = Lobster({
  subsets: ["latin"],
  weight: "400",
});

export function Footer() {
  return (
    <footer className="flex flex-col items-center justify-center mb-10">
      <Link
        href={paths.home.getHref()}
        className="flex gap-2 text-tint-500 items-center mb-[2.625rem]"
      >
        <MicrophoneIcon />
        <span className={`${lobster.className} text-[2.5rem]`}>SeatSure</span>
      </Link>

      <nav>
        <ul className="flex gap-10 text-white text-base mb-[2.625rem]">
          <li>
            <Link href={paths.home.getHref()}>Home</Link>
          </li>
          <li>
            <Link href={paths.about.getHref("contact")}>Contact us</Link>
          </li>
          <li>
            <Link href={paths.about.getHref()}>About us</Link>
          </li>
          <li>
            <Link href={paths.terms.getHref()}>Privacy Policy</Link>
          </li>
        </ul>
      </nav>

      <ul className="flex gap-8 mb-[2.625rem]">
        <li>
          <a href="">
            <FacebookIcon />
          </a>
        </li>

        <li>
          <a href="">
            <InstagramIcon />
          </a>
        </li>

        <li>
          <a href="">
            <LinkedinIcon />
          </a>
        </li>

        <li>
          <a href="">
            <YoutubeIcon />
          </a>
        </li>

        <li>
          <a href="">
            <TelegramIcon />
          </a>
        </li>
      </ul>

      <hr className="border-white/20 self-stretch mx-[111px] mb-[2rem]" />

      <p className="text-sm">Copyright SeatSure</p>
    </footer>
  );
}
