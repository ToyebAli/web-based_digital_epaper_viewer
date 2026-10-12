
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export type NewspaperPageData = {
  id: number;
  page_number: number;
  image_url: string;
};

export type NewspaperData = {
  id: number;
  title: string;
  publication_date: string;
  description: string;
  cover_image_url: string | null;
  pages: NewspaperPageData[];
};

export async function getNewspapers(): Promise<NewspaperData[]> {
  const response = await fetch(`${API_URL}/api/newspapers/`);

  if (!response.ok) {
    throw new Error(`Failed to fetch newspapers: ${response.status}`);
  }

  const data: NewspaperData[] = await response.json();

  return data.map((newspaper) => ({
    ...newspaper,
    cover_image_url: newspaper.cover_image_url
      ? new URL(newspaper.cover_image_url, API_URL).href
      : null,
    pages: newspaper.pages.map((page) => ({
      ...page,
      image_url: new URL(page.image_url, API_URL).href,
    })),
  }));
}
