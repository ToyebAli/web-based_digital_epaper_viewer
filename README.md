This is a Next.js frontend with a Django REST API backend for newspaper editions.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Article section coordinates

Article boundaries are stored as percentage coordinates relative to the original
page image. They do not depend on the image's displayed size, so the hotspots
stay aligned when the page is resized.

After adding the new Django model, apply its migration:

```bash
cd backend
python manage.py migrate
```

To annotate a page, sign in to Django Admin, open **Newspaper pages**, select a
page, and add one **Newspaper page region** for each article. Record the article
title and its rectangle: `x` and `y` are the left/top edges, while `width` and
`height` are the rectangle dimensions; all four values are percentages from 0
to 100. The rectangle must fit inside the page. Set `sort_order` to control
which section appears first.

For a source image of `700 x 1100` pixels and an article rectangle from
`(21, 126)` to `(185, 335)`, enter:

```text
x      = 3
y      = 11.45
width  = 23.43
height = 19
```

The newspaper list API includes the annotations under each page:

```json
{
  "id": 1,
  "page_number": 1,
  "image_url": "/media/newspapers/pages/page-1.jpg",
  "sections": [
    {
      "id": 1,
      "title": "Main story",
      "x": 3.0,
      "y": 11.45,
      "width": 23.43,
      "height": 19.0,
      "sort_order": 1
    }
  ]
}
```

The frontend sends each backend rectangle to a native HTML `<map>` as a
clickable `<area shape="rect">`. Percentage coordinates are converted to
pixel-based `coords` for the currently displayed image size, and recalculated
when the image is resized. Hovering an area highlights its rectangle; selecting
it crops that exact region for zoom. Coordinates must be entered for each
uploaded page: the reference e-paper uses manually supplied HTML image-map
rectangles, not automatic article detection. Migration
`0003_seed_reference_page_sections` imports the 16 verified rectangles for the
matching `6acbc690d4e1f.jpg` front page. Other uploaded pages need annotations
added in Admin before their articles become clickable.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
