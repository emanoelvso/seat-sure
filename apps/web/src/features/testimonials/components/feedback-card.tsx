import Image from "next/image";
import { StarIcon } from "@/components/icons/star-icon";
import { HalfStarIcon } from "@/components/icons/half-star-icon";
import { EmptyStarIcon } from "@/components/icons/empty-star-icon";

interface FeedbackCardProps {
  comment: string;
  name: string;
  avatarUrl: string;
  rating: number;
}

export function FeedbackCard({
  comment,
  name,
  avatarUrl,
  rating,
}: FeedbackCardProps) {
  return (
    <div className="max-w-2xs bg-neutral-800 py-3 px-4 rounded-2xl">
      <span className="font-sm">{comment}</span>
      <div className="flex mt-4 items-center gap-2">
        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
          <Image
            className="object-cover w-full h-full"
            src={avatarUrl}
            alt="Profile Avatar"
            width={40}
            height={40}
          />
        </div>
        <div className="flex flex-col">
          <span>{name}</span>
          <div className="flex">
            {Array.from({ length: 5 }, (_, i) => {
              const pos = i + 1;
              const Star =
                rating >= pos
                  ? StarIcon
                  : rating >= pos - 0.5
                    ? HalfStarIcon
                    : EmptyStarIcon;

              return <Star key={i} />;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
