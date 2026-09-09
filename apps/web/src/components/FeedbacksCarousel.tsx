import Carousel from "./Carousel";
import FeedbackCard from "./FeedbackCard";

interface Feedback {
  comment: string;
  name: string;
  avatarUrl: string;
  rating: number;
}

interface FeedbacksCarouselProps {
  row1: Feedback[];
  row2: Feedback[];
}

export default function FeedbacksCarousel({
  row1,
  row2,
}: FeedbacksCarouselProps) {
  return (
    <Carousel
      row1={row1}
      row2={row2}
      renderItem={(feedback, i) => (
        <FeedbackCard
          key={i}
          comment={feedback.comment}
          name={feedback.name}
          avatarUrl={feedback.avatarUrl}
          rating={feedback.rating}
        />
      )}
    />
  );
}
