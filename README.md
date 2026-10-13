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

To annotate any uploaded page, sign in to Django Admin, open **Newspaper pages**,
select the page, save it, and click **Draw article boundaries**. Drag over each
article on the displayed page image, enter its title in the section list, and
save. To make several rectangles open as one article, check those sections and
click **Create new group**; this creates a fresh group without reusing or
combining any existing group. Click **Unmerge selected** to separate sections
again. To connect articles across pages, select the first section, create its
group, and save. Then open another page's annotator, select its continuation
section, choose the saved merge group from **Add selected to existing group**,
and click **Add to existing group**, then save. Groups are displayed as
**Group 1**, **Group 2**, and so on; each newly created group receives the next
number, while the stored group ID remains consistent across pages.
The reader opens each group member's exact crop, ordered by page and section,
when any member is clicked.
The annotator calculates normalized `x`, `y`, `width`, and `height`
percentages from the displayed image dimensions; it works with different source
image sizes and recalculates against the original aspect ratio. Existing
sections can be reviewed, renamed, or removed before saving.

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
      "sort_order": 1,
      "merge_group": "lead-story"
    }
  ]
}
```

The frontend sends each backend rectangle to a native HTML `<map>` as a
clickable `<area shape="rect">`. Percentage coordinates are converted to
pixel-based `coords` for the currently displayed image size, and recalculated
when the image is resized. Hovering an area highlights its rectangle; selecting
it crops that exact region for zoom. Selecting a merged section displays each
member crop separately; the modal does not include the whitespace between
separate article boundaries. Coordinates must be entered for each
uploaded page: the reference e-paper uses manually supplied HTML image-map
rectangles, not automatic article detection. Migration
`0003_seed_reference_page_sections` imports the 16 verified rectangles for the
matching `6acbc690d4e1f.jpg` front page. Other uploaded pages can use the
Admin drawing tool to create their own coordinates.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
