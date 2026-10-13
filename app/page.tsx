"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getNewspapers,
  type NewspaperData,
  type NewspaperPageSectionData,
} from "../lib/api";

type PageItem = {
  id: number;
  page_number: number;
  image_url: string;
  newspaperId: number;
  newspaperTitle: string;
  publicationDate: string;
  sections: NewspaperPageSectionData[];
};

type NewspaperImageMapProps = {
  page: PageItem;
  onSelectSection: (index: number) => void;
};

function NewspaperImageMap({
  page,
  onSelectSection,
}: NewspaperImageMapProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [hoveredSection, setHoveredSection] = useState<number | null>(null);
  const mapName = `newspaper-page-map-${page.id}`;

  useEffect(() => {
    function updateImageSize() {
      const image = imageRef.current;
      if (!image) return;

      const bounds = image.getBoundingClientRect();
      const width = Math.round(bounds.width);
      const height = Math.round(bounds.height);

      setImageSize((current) =>
        current.width === width && current.height === height
          ? current
          : { width, height },
      );
    }

    updateImageSize();

    const image = imageRef.current;
    if (!image) return;

    const resizeObserver = new ResizeObserver(updateImageSize);
    resizeObserver.observe(image);

    return () => resizeObserver.disconnect();
  }, [page.image_url]);

  function getSectionCoords(section: NewspaperPageSectionData) {
    const left = Math.round((imageSize.width * section.x) / 100);
    const top = Math.round((imageSize.height * section.y) / 100);
    const right = Math.round(
      (imageSize.width * (section.x + section.width)) / 100,
    );
    const bottom = Math.round(
      (imageSize.height * (section.y + section.height)) / 100,
    );

    return `${left},${top},${right},${bottom}`;
  }

  return (
    <div className="annotated-page">
      <img
        ref={imageRef}
        className="annotated-page-image"
        draggable={false}
        src={page.image_url}
        alt={`${page.newspaperTitle} - Page ${page.page_number}`}
        useMap={`#${mapName}`}
        onLoad={(event) => {
          const image = event.currentTarget;
          const bounds = image.getBoundingClientRect();
          setImageSize({
            width: Math.round(bounds.width),
            height: Math.round(bounds.height),
          });
        }}
      />

      <map id={mapName} name={mapName}>
        {imageSize.width > 0 &&
          imageSize.height > 0 &&
          page.sections.map((section, index) => (
            <area
              key={section.id}
              shape="rect"
              coords={getSectionCoords(section)}
              href={`#${mapName}`}
              alt={section.title}
              title={section.title}
              onMouseEnter={() => setHoveredSection(index)}
              onMouseLeave={() => setHoveredSection(null)}
              onFocus={() => setHoveredSection(index)}
              onBlur={() => setHoveredSection(null)}
              onClick={(event) => {
                event.preventDefault();
                onSelectSection(index);
              }}
            />
          ))}
      </map>

      {hoveredSection !== null && page.sections[hoveredSection] && (
        <div
          className="section-highlight"
          style={{
            left: `${page.sections[hoveredSection].x}%`,
            top: `${page.sections[hoveredSection].y}%`,
            width: `${page.sections[hoveredSection].width}%`,
            height: `${page.sections[hoveredSection].height}%`,
          }}
        >
          <span>{page.sections[hoveredSection].title}</span>
        </div>
      )}

      {page.sections.length === 0 && (
        <p className="section-empty-note">
          No article coordinates yet. Add sections for this page from Django
          Admin.
        </p>
      )}
    </div>
  );
}

type ArticleCropProps = {
  imageUrl: string;
  section: NewspaperPageSectionData;
  zoom: number;
};

function ArticleCrop({ imageUrl, section, zoom }: ArticleCropProps) {
  const [pageAspectRatio, setPageAspectRatio] = useState<number | null>(null);

  return (
    <div
      className="section-zoom-viewport"
      role="img"
      aria-label={section.title}
      style={{
        aspectRatio: `${
          ((pageAspectRatio ?? 7 / 11) * section.width) / section.height
        }`,
      }}
    >
      <img
        src={imageUrl}
        alt=""
        draggable={false}
        onLoad={(event) => {
          const image = event.currentTarget;
          if (image.naturalWidth && image.naturalHeight) {
            setPageAspectRatio(image.naturalWidth / image.naturalHeight);
          }
        }}
        style={{
          width: `${(10000 / section.width) * zoom}%`,
          left: `${(-section.x / section.width) * 100 * zoom}%`,
          top: `${(-section.y / section.height) * 100 * zoom}%`,
        }}
      />
    </div>
  );
}

export default function Home() {
  const [newspapers, setNewspapers] = useState<NewspaperData[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [selectedPage, setSelectedPage] = useState<number | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<number | null>(null);
  const [modalZoom, setModalZoom] = useState(1);
  const [modalPan, setModalPan] = useState({ x: 0, y: 0 });
  const modalImageRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{
    pointerId: number;
    x: number;
    y: number;
    panX: number;
    panY: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadNewspapers() {
      try {
        setLoading(true);
        setApiError("");

        const data = await getNewspapers();

        if (!cancelled) {
          setNewspapers(data);
          if (data.some((newspaper) => newspaper.pages.length > 0)) {
            setSelectedPage(0);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setApiError(
            error instanceof Error
              ? error.message
              : "Failed to load newspapers.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadNewspapers();

    return () => {
      cancelled = true;
    };
  }, []);

  const allPages: PageItem[] = useMemo(
    () =>
      newspapers.flatMap((newspaper) =>
        newspaper.pages.map((page) => ({
          ...page,
          newspaperId: newspaper.id,
          newspaperTitle: newspaper.title,
          publicationDate: newspaper.publication_date,
          sections: page.sections,
        })),
      ),
    [newspapers],
  );

  const goToPage = useCallback((direction: number) => {
    if (selectedPage === null) return;

    const activeNewspaperId = allPages[selectedPage]?.newspaperId;
    const editionPageIndexes = allPages.flatMap((page, index) =>
      page.newspaperId === activeNewspaperId ? [index] : [],
    );
    const currentPosition = editionPageIndexes.indexOf(selectedPage);
    const next = editionPageIndexes[currentPosition + direction];

    if (next !== undefined) {
      setSelectedPage(next);
      setSelectedRegion(null);
      setModalZoom(1);
      setModalPan({ x: 0, y: 0 });
    }
  }, [allPages, selectedPage]);

  const handleModalWheel = useCallback((event: WheelEvent) => {
    if (!(event.target instanceof Element) || !event.target.closest("img")) {
      return;
    }
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.15 : 1 / 1.15;
    const nextZoom = Math.min(4, Math.max(1, modalZoom * factor));
    if (nextZoom === modalZoom) return;

    if (nextZoom === 1) setModalPan({ x: 0, y: 0 });
    setModalZoom(nextZoom);
  }, [modalZoom]);

  useEffect(() => {
    const image = modalImageRef.current;
    if (!image) return;

    image.addEventListener("wheel", handleModalWheel, { passive: false });
    return () => image.removeEventListener("wheel", handleModalWheel);
  }, [handleModalWheel, selectedRegion]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (selectedPage === null) return;

      if (event.key === "ArrowRight") {
        goToPage(1);
      }

      if (event.key === "ArrowLeft") {
        goToPage(-1);
      }

      if (event.key === "Escape") {
        if (selectedRegion !== null) {
          setSelectedRegion(null);
          setModalZoom(1);
          setModalPan({ x: 0, y: 0 });
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPage, selectedPage, selectedRegion]);

  if (loading) {
    return (
      <main>
        <p>Loading newspapers...</p>
      </main>
    );
  }

  if (apiError) {
    return (
      <main>
        <h2>Could not load newspapers</h2>
        <p>{apiError}</p>
        <button onClick={() => window.location.reload()}>Try Again</button>
      </main>
    );
  }

  const activePage = selectedPage !== null ? allPages[selectedPage] : null;

  const currentNewspaper = activePage
    ? newspapers.find((item) => item.id === activePage.newspaperId)
    : null;

  const selectedSection =
    selectedRegion !== null && activePage
      ? activePage.sections[selectedRegion]
      : null;
  const selectedGroupMembers = selectedSection
    ? selectedSection.merge_group
      ? allPages
          .filter((page) => page.newspaperId === activePage?.newspaperId)
          .flatMap((page) =>
            page.sections
              .filter(
                (section) =>
                  section.merge_group === selectedSection.merge_group,
              )
              .map((section) => ({ page, section })),
          )
          .sort(
            (left, right) =>
              left.page.page_number - right.page.page_number ||
              left.section.sort_order - right.section.sort_order,
          )
      : activePage
        ? [{ page: activePage, section: selectedSection }]
        : []
    : [];

  const editionPages = activePage
    ? allPages.filter((page) => page.newspaperId === activePage.newspaperId)
    : [];
  const activeEditionPageIndex = activePage
    ? editionPages.findIndex((page) => page.id === activePage.id)
    : -1;
  const publicationDate = currentNewspaper
    ? new Date(`${currentNewspaper.publication_date}T12:00:00`).toLocaleDateString(
        "bn-BD-u-ca-gregory",
        {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        },
      )
    : "";

  function selectEditionPage(pageId: number) {
    const index = allPages.findIndex((page) => page.id === pageId);
    if (index < 0) return;
    setSelectedPage(index);
    setSelectedRegion(null);
    setModalZoom(1);
    setModalPan({ x: 0, y: 0 });
  }

  function handleModalPointerDown(
    event: React.PointerEvent<HTMLDivElement>,
  ) {
    if (event.button !== 0) return;
    if (!(event.target instanceof Element) || !event.target.closest("img")) return;

    dragStart.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      panX: modalPan.x,
      panY: modalPan.y,
      moved: false,
    };
  }

  function handleModalPointerMove(
    event: React.PointerEvent<HTMLDivElement>,
  ) {
    const drag = dragStart.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.x;
    const deltaY = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(deltaX, deltaY) < 3) return;

    if (!drag.moved) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    drag.moved = true;
    setModalPan({ x: drag.panX + deltaX, y: drag.panY + deltaY });
  }

  function finishModalDrag(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragStart.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragStart.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <main className="epaper-app">
      <header className="epaper-masthead">
        <a
          className="epaper-brand"
          href="#edition"
          aria-label={currentNewspaper?.title ?? "E-paper edition"}
        >
          <span className="epaper-brand-mark">প্র</span>
          <span className="epaper-brand-copy">
            <strong>{currentNewspaper?.title ?? "ই-পেপার"}</strong>
            <small>ডিজিটাল সংবাদপত্র</small>
          </span>
        </a>
        {publicationDate && (
          <time className="epaper-date" dateTime={currentNewspaper?.publication_date}>
            {publicationDate}
          </time>
        )}
      </header>

      <nav className="epaper-toolbar" aria-label="Edition tools">
        <a className="epaper-tool-link epaper-home-link" href="#edition" aria-label="Home">
          <span aria-hidden="true">⌂</span>
          <span className="epaper-tool-label">হোম</span>
        </a>
        {activePage && (
          <a
            className="epaper-tool-link"
            href={activePage.image_url}
            target="_blank"
            rel="noreferrer"
          >
            <span aria-hidden="true">↓</span> ডাউনলোড
          </a>
        )}
        <div className="epaper-page-links" aria-label="Choose newspaper page">
          {editionPages.map((page) => (
            <button
              className={
                page.id === activePage?.id ? "epaper-page-link is-active" : "epaper-page-link"
              }
              key={page.id}
              onClick={() => selectEditionPage(page.id)}
              aria-current={page.id === activePage?.id ? "page" : undefined}
            >
              {page.page_number}
            </button>
          ))}
        </div>
        <span className="epaper-toolbar-spacer" />
        <span className="epaper-edition-name">{currentNewspaper?.title}</span>
        <button className="epaper-tool-link epaper-print-button" onClick={() => window.print()}>
          <span aria-hidden="true">▣</span> প্রিন্ট
        </button>
      </nav>

      {allPages.length === 0 ? (
        <section className="epaper-empty">
          <h1>কোনো সংবাদপত্রের পাতা পাওয়া যায়নি</h1>
          <p>প্রথমে Django Admin থেকে একটি সংবাদপত্র ও তার পাতা যোগ করুন।</p>
        </section>
      ) : activePage ? (
        <div className="epaper-layout" id="edition">
          <aside className="epaper-page-sidebar" aria-label="All newspaper pages">
            <h2>সকল পাতা</h2>
            <div className="epaper-thumbnails">
              {editionPages.map((page) => (
                <button
                  className={
                    page.id === activePage.id
                      ? "epaper-thumbnail is-active"
                      : "epaper-thumbnail"
                  }
                  key={page.id}
                  onClick={() => selectEditionPage(page.id)}
                  aria-label={`পৃষ্ঠা ${page.page_number}`}
                  aria-current={page.id === activePage.id ? "page" : undefined}
                >
                  <span className="epaper-thumbnail-image">
                    <img
                      src={page.image_url}
                      alt=""
                      draggable={false}
                      loading="lazy"
                    />
                  </span>
                  <span className="epaper-thumbnail-caption">
                    <span className="epaper-thumbnail-check" aria-hidden="true">
                      {page.id === activePage.id ? "✓" : ""}
                    </span>
                    পৃষ্ঠা {page.page_number}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <section className="epaper-reader" aria-label="Newspaper page reader">
            <div className="epaper-reader-toolbar">
              <span className="epaper-current-page">
                পৃষ্ঠা {activePage.page_number} / {editionPages.length}
              </span>

              <div className="epaper-reader-nav">
                <button
                  onClick={() => goToPage(-1)}
                  disabled={activeEditionPageIndex <= 0}
                >
                  ‹ পূর্বের পাতা
                </button>
                <button
                  onClick={() => goToPage(1)}
                  disabled={activeEditionPageIndex >= editionPages.length - 1}
                >
                  পরের পাতা ›
                </button>
              </div>
            </div>

            <div
              className="epaper-page-stage"
            >
              <NewspaperImageMap
                page={activePage}
                onSelectSection={(index) => {
                  setSelectedRegion(index);
                  setModalZoom(1);
                  setModalPan({ x: 0, y: 0 });
                }}
              />
            </div>

            <div className="epaper-bottom-nav">
              <button
                className="epaper-blue-button"
                onClick={() => {
                  setSelectedRegion(null);
                  setModalZoom(1);
                  setModalPan({ x: 0, y: 0 });
                }}
              >
                ▤ <span>সকল পাতা</span>
              </button>
              <span className="epaper-bottom-count">
                {activeEditionPageIndex + 1} / {editionPages.length}
              </span>
              <button
                className="epaper-blue-button"
                onClick={() => goToPage(1)}
                disabled={activeEditionPageIndex >= editionPages.length - 1}
              >
                <span>পরের পাতা</span> »
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {selectedSection && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedRegion(null);
              setModalZoom(1);
              setModalPan({ x: 0, y: 0 });
            }
          }}
        >
          <section
            className="reader-modal"
            role="dialog"
            aria-modal="true"
            aria-label={selectedSection.title}
          >
            <div className="reader-toolbar">
              <div>
                <strong>নির্বাচিত সংবাদ</strong>
                <small>
                  সংবাদপত্রের ছবির ওপর স্ক্রল করলে জুম হবে; ছবির বাইরে স্ক্রল
                  করলে অংশটি ওপর-নিচে সরবে।
                </small>
              </div>
              <button
                className="close-button"
                aria-label="Close article"
                onClick={() => {
                  setSelectedRegion(null);
                  setModalZoom(1);
                  setModalPan({ x: 0, y: 0 });
                }}
              >
                ×
              </button>
            </div>
            <div className="reader-content">
              {selectedGroupMembers.length > 0 ? (
                <div
                  ref={modalImageRef}
                  className={`section-zoom-stack${modalZoom > 1 ? " is-zoomed" : ""}`}
                  onPointerDown={handleModalPointerDown}
                  onPointerMove={handleModalPointerMove}
                  onPointerUp={finishModalDrag}
                  onPointerCancel={finishModalDrag}
                  style={{
                    transform: `translate(${modalPan.x}px, ${modalPan.y}px)`,
                  }}
                >
                  {selectedGroupMembers.map(({ page, section }) => (
                    <ArticleCrop
                      key={`${page.id}-${section.id}`}
                      imageUrl={page.image_url}
                      section={section}
                      zoom={modalZoom}
                    />
                  ))}
                </div>
              ) : (
                <p>এই পাতার নির্বাচিত অংশটি পাওয়া যায়নি।</p>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
