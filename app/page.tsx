"use client";

import { useEffect, useState } from "react";

const pages = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  title:
    index === 0
      ? "Today's Main News"
      : [
          "National News",
          "International",
          "Politics",
          "Economy",
          "Sports",
          "Entertainment",
          "Editorial",
          "Business",
          "Lifestyle",
          "Technology",
          "Last Page",
        ][(index - 1) % 11],
}));

export default function Home() {
  const [selectedPage, setSelectedPage] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);

  function goToPage(direction: number) {
    if (selectedPage === null) return;

    const next = selectedPage + direction;

    if (next >= 1 && next <= pages.length) {
      setSelectedPage(next);
    }
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (selectedPage === null) return;

      if (event.key === "ArrowRight") goToPage(1);
      if (event.key === "ArrowLeft") goToPage(-1);
      if (event.key === "Escape") setSelectedPage(null);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPage]);

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#">
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
          <span className="page-count">{pages.length} Pages</span>
        </div>

        <div className="page-grid">
          {pages.map((page) => (
            <button
              className="page-card"
              key={page.id}
              onClick={() => setSelectedPage(page.id)}
              aria-label={`Open page ${page.id}`}
            >
              <div className="paper-preview">
                <img
                  className="page-thumbnail"
                  src={`/pages/page-${page.id}.jpg`}
                  alt={`Newspaper page ${page.id}`}
                  loading="lazy"
                />
              </div>
              <div className="page-card-footer">
                <span className="page-number">
                  Page {String(page.id).padStart(2, "0")}
                </span>
                <span className="open-icon">↗</span>
              </div>
              <span className="page-title">{page.title}</span>
            </button>
          ))}
        </div>
      </section>

      <footer id="about">
        <div className="footer-brand">প্রতিদিন · DIGITAL EPAPER</div>
        <p>A simple digital newspaper reading experience.</p>
        <small>Demo project · Built with Next.js</small>
      </footer>

      {selectedPage !== null && (
        <div className="modal-overlay" onClick={() => setSelectedPage(null)}>
          <section
            className="reader-modal"
            role="dialog"
            aria-modal="true"
            aria-label={`Newspaper page ${selectedPage}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="reader-toolbar">
              <div>
                <strong>Digital Reader</strong>
                <small>
                  Page {selectedPage} of {pages.length}
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
                  src={`/pages/page-${selectedPage}.jpg`}
                  alt={`Newspaper page ${selectedPage}`}
                />
              </div>
            </div>

            <div className="reader-navigation">
              <button
                onClick={() => goToPage(-1)}
                disabled={selectedPage === 1}
              >
                ← Previous
              </button>
              <span>
                {selectedPage} / {pages.length}
              </span>
              <button
                onClick={() => goToPage(1)}
                disabled={selectedPage === pages.length}
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

function NewspaperPage({ pageNumber }: { pageNumber: number }) {
  return (
    <article className="newspaper-sheet">
      <div className="paper-date">DAILY EDITION · OCTOBER 11, 2026</div>

      <div className="paper-masthead">প্রতিদিন</div>

      <div className="paper-subtitle">THE DAILY NEWS · BANGLADESH</div>

      <div className="paper-rule" />

      <div className="paper-category">
        {pageNumber === 1 ? "TODAY'S TOP STORY" : `NEWS SECTION ${pageNumber}`}
      </div>

      <h3 className="paper-headline">
        {pageNumber === 1
          ? "Today's Biggest Stories From Bangladesh"
          : pagesHeadline(pageNumber)}
      </h3>

      <div className="paper-columns">
        <div className="paper-column">
          <div className="fake-photo">
            <span>PHOTO {pageNumber}</span>
          </div>
          <p className="fake-line long" />
          <p className="fake-line" />
          <p className="fake-line long" />
          <p className="fake-line medium" />
          <p className="fake-line long" />
          <p className="fake-line short" />
          <p className="fake-line long" />
          <p className="fake-line medium" />
        </div>

        <div className="paper-column">
          <h4>Latest Updates</h4>
          {Array.from({ length: 12 }, (_, index) => (
            <p className="fake-line" key={index} />
          ))}
        </div>

        <div className="paper-column">
          <h4>In Focus</h4>
          {Array.from({ length: 10 }, (_, index) => (
            <p className="fake-line" key={index} />
          ))}
        </div>
      </div>

      <div className="paper-bottom">SAMPLE NEWSPAPER PAGE · {pageNumber}</div>
    </article>
  );
}

function pagesHeadline(page: number) {
  const headlines = [
    "Important Updates From Around The World",
    "New Developments In National Politics",
    "Business And Economic News Today",
    "Latest Sports News And Highlights",
    "Culture, Arts And Entertainment",
    "Opinions And Editorial Highlights",
    "Markets And Business Developments",
    "Lifestyle And Health Updates",
    "Technology And Innovation News",
    "Today's Special Reports",
    "More Stories From Today's Edition",
  ];

  return headlines[(page - 2 + headlines.length) % headlines.length];
}
