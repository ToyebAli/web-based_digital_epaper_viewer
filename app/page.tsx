"use client";

import { useEffect, useState } from "react";
import { getNewspapers, type NewspaperData } from "../lib/api";

type PageItem = {
  id: number;
  page_number: number;
  image_url: string;
  newspaperId: number;
  newspaperTitle: string;
  publicationDate: string;
};

export default function Home() {
  const [newspapers, setNewspapers] = useState<NewspaperData[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [selectedPage, setSelectedPage] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);

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
    })),
  );

  function goToPage(direction: number) {
    if (selectedPage === null) return;

    const next = selectedPage + direction;

    if (next >= 0 && next < allPages.length) {
      setSelectedPage(next);
      setZoom(1);
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
      }

      if (event.key === "ArrowLeft") {
        setSelectedPage((current) =>
          current !== null && current > 0 ? current - 1 : current,
        );
      }

      if (event.key === "Escape") {
        setSelectedPage(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPage, allPages.length]);

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
          <h1>Today's Newspaper</h1>
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
            <p className="muted">Select any page to read it in detail.</p>
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
                  setZoom(1);
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
        <div className="modal-overlay" onClick={() => setSelectedPage(null)}>
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
                </small>
              </div>

              <div className="zoom-controls">
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

              <button
                className="close-button"
                onClick={() => setSelectedPage(null)}
                aria-label="Close reader"
              >
                ✕
              </button>
            </div>

            <div className="reader-content">
              <div
                className="large-paper"
                style={{
                  width: `${zoom * 100}%`,
                  minWidth: `${zoom * 100}%`,
                }}
              >
                <img
                  className="reader-image"
                  src={activePage.image_url}
                  alt={`${activePage.newspaperTitle} - Page ${activePage.page_number}`}
                />
              </div>
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
