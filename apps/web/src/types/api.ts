// Entities shared by two or more features.

export interface EventSummary {
  id: string;
  name: string;
  description?: string;
  coverImage: string;
  venue: string;
  city: string;
  country: string;
  date: string;
  startAt: string;
  status: string;
  price: number;
  category: string;
  tags?: string[];
}
