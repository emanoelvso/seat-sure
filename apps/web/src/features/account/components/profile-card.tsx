import { PenIcon } from "@solar-icons/react/outline";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/utils/initials";

interface ProfileCardProps {
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
}

// Profile card (PROFILE-01 AC 2), from Figma 5011:120441: 24px padding on
// #121212, radius 24, glow and lines exported from the file as one PNG. The
// "Edit" button is disabled until avatar upload exists (out of scope).
export function ProfileCard({
  firstName,
  lastName,
  email,
  avatarUrl,
}: ProfileCardProps) {
  return (
    <section
      aria-label="Profile"
      className="flex items-center justify-between overflow-hidden rounded-3xl bg-neutral-1000 bg-[url('/account/profile-card-background.png')] bg-size-[auto_100%] bg-left bg-no-repeat p-6"
    >
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt="Profile Avatar"
            width={95}
            height={95}
            className="size-[95px] shrink-0 rounded-full object-cover"
          />
        ) : (
          <div
            aria-label="Profile Avatar"
            role="img"
            className="flex size-[95px] shrink-0 items-center justify-center rounded-full bg-neutral-700 text-3xl font-medium text-white"
          >
            {getInitials(firstName, lastName, email)}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium text-white">Hey {firstName}!</h1>
          <p className="text-xs text-neutral-100">{email}</p>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled
        leftIcon={PenIcon}
        iconSize={24}
        className="rounded-lg px-4 py-[3px] disabled:text-neutral-200!"
      >
        Edit
      </Button>
    </section>
  );
}
