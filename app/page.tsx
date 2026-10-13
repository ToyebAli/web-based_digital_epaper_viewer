"use client";

import { useEffect, useRef, useState } from "react";
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

export default function Home() {
  const [newspapers, setNewspapers] = useState<NewspaperData[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [selectedPage, setSelectedPage] = useState<number | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pageAspectRatio, setPageAspectRatio] = useState(7 / 11);

  useEffect(() => {
    let cancelled = false;

    async function loadNewspapers() {
      try {
        setLoading(true);
        setApiError("");

        const data = await getNewspapers();

        if (!cancelled) {
          setNewspapers(data);
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

  const allPages: PageItem[] = newspapers.flatMap((newspaper) =>
    newspaper.pages.map((page) => ({
      ...page,
      newspaperId: newspaper.id,
      newspaperTitle: newspaper.title,
      publicationDate: newspaper.publication_date,
      sections: page.sections,
    })),
  );

  function goToPage(direction: number) {
    if (selectedPage === null) return;

    const next = selectedPage + direction;

    if (next >= 0 && next < allPages.length) {
      setSelectedPage(next);
      setSelectedRegion(null);
      setZoom(1);
      setPageAspectRatio(7 / 11);
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (selectedPage === null) return;

      if (event.key === "ArrowRight") {
        setSelectedPage((current) =>
          current !== null && current < allPages.length - 1
            ? current + 1
            : current,
        );
        setSelectedRegion(null);
        setZoom(1);
        setPageAspectRatio(7 / 11);
      }

      if (event.key === "ArrowLeft") {
        setSelectedPage((current) =>
          current !== null && current > 0 ? current - 1 : current,
        );
        setSelectedRegion(null);
        setZoom(1);
        setPageAspectRatio(7 / 11);
      }

      if (event.key === "Escape") {
        if (selectedRegion !== null) {
          setSelectedRegion(null);
          setZoom(1);
          setPageAspectRatio(7 / 11);
        } else {
          setSelectedPage(null);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPage, selectedRegion, allPages.length]);

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

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#home">
          <span className="brand-icon">প</span>
          <span>
            <strong>প্রতিদিন</strong>
            <small>DIGITAL EPAPER</small>
          </span>
        </a>

        <nav className="nav-links">
          <a href="#home">Home</a>
          <a href="#pages">All Pages</a>
          <a href="#about">About</a>
        </nav>

        <span className="live-label">● DIGITAL EDITION</span>
      </header>

      <section className="hero" id="home">
        <div className="hero-content">
          <p className="eyebrow">YOUR DAILY NEWS, IN ONE PLACE</p>
          <h1>Today&apos;s Newspaper</h1>
          <p className="hero-description">
            Read every page. Explore every story.
          </p>

          <div className="edition-info">
            <span>বাংলা সংবাদপত্র</span>
            <span>•</span>
            <span>
              {new Date().toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </section>

      <section className="page-section" id="pages">
        <div className="section-heading">
          <div>
            <p className="eyebrow">EXPLORE THE EDITION</p>
            <h2>Newspaper Pages</h2>
            <p className="muted">
              Select a page, then choose a section to zoom in.
            </p>
          </div>

          <span className="page-count">{allPages.length} Pages</span>
        </div>

        {allPages.length === 0 ? (
          <p>No newspaper pages available yet.</p>
        ) : (
          <div className="page-grid">
            {allPages.map((page, index) => (
              <button
                className="page-card"
                key={`${page.newspaperId}-${page.id}`}
                onClick={() => {
                  setSelectedPage(index);
                  setSelectedRegion(null);
                  setZoom(1);
                  setPageAspectRatio(7 / 11);
                }}
                aria-label={`Open ${page.newspaperTitle}, page ${page.page_number}`}
              >
                <div className="paper-preview">
                  <img
                    className="page-thumbnail"
                    src={page.image_url}
                    alt={`${page.newspaperTitle} - Page ${page.page_number}`}
                    loading="lazy"
                  />
                </div>

                <div className="page-card-footer">
                  <span className="page-number">
                    Page {String(page.page_number).padStart(2, "0")}
                  </span>
                  <span className="open-icon">↗</span>
                </div>

                <span className="page-title">{page.newspaperTitle}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <footer id="about">
        <div className="footer-brand">প্রতিদিন · DIGITAL EPAPER</div>
        <p>A simple digital newspaper reading experience.</p>
        <small>Built with Next.js and Django</small>
      </footer>

      {selectedPage !== null && activePage && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedPage(null)}
        >
          <section
            className="reader-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Newspaper page ${activePage.page_number}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="reader-toolbar">
              <div>
                <strong>{activePage.newspaperTitle}</strong>
                <small>
                  Page {activePage.page_number} of{" "}
                  {currentNewspaper?.pages.length ?? allPages.length}
                  {selectedRegion !== null &&
                    ` · ${activePage.sections[selectedRegion]?.title ?? "Section"}`}
                </small>
              </div>

              {selectedRegion !== null && (
                <div className="zoom-controls">
                  <button
                    onClick={() => {
                      setSelectedRegion(null);
                      setZoom(1);
                    }}
                  >
                    All sections
                  </button>

                  <button
                    onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                    aria-label="Zoom out"
                  >
                    −
                  </button>

                  <span>{Math.round(zoom * 100)}%</span>

                  <button
                    onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
                    aria-label="Zoom in"
                  >
                    +
                  </button>

                  <button onClick={() => setZoom(1)}>Reset</button>
                </div>
              )}

              <button
                className="close-button"
                onClick={() => setSelectedPage(null)}
                aria-label="Close reader"
              >
                ✕
              </button>
            </div>

            <div className="reader-content">
              {selectedRegion === null ? (
                <NewspaperImageMap
                  page={activePage}
                  onSelectSection={(index) => {
                    setSelectedRegion(index);
                    setZoom(1);
                  }}
                />
              ) : activePage.sections[selectedRegion] ? (
                <div
                  className="section-zoom-viewport"
                  role="img"
                  aria-label={activePage.sections[selectedRegion].title}
                  style={{
                    aspectRatio: `${
                      (pageAspectRatio *
                        activePage.sections[selectedRegion].width) /
                      activePage.sections[selectedRegion].height
                    }`,
                  }}
                >
                  <img
                    src={activePage.image_url}
                    alt=""
                    style={{
                      width: `${
                        (10000 /
                          activePage.sections[selectedRegion].width) *
                        zoom
                      }%`,
                      left: `${
                        (-activePage.sections[selectedRegion].x /
                          activePage.sections[selectedRegion].width) *
                        100 *
                        zoom
                      }%`,
                      top: `${
                        (-activePage.sections[selectedRegion].y /
                          activePage.sections[selectedRegion].height) *
                        100 *
                        zoom
                      }%`,
                    }}
                  />
                </div>
              ) : (
                <p className="section-empty-note">
                  This page section is unavailable.
                </p>
              )}
            </div>

            <div className="reader-navigation">
              <button
                onClick={() => goToPage(-1)}
                disabled={selectedPage === 0}
              >
                ← Previous
              </button>

              <span>
                {selectedPage + 1} / {allPages.length}
              </span>

              <button
                onClick={() => goToPage(1)}
                disabled={selectedPage === allPages.length - 1}
              >
                Next →
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
