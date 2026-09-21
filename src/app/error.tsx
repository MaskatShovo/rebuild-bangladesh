"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="container page">
      <h1>Something needs another try.</h1>
      <p>We could not load this page. Please try again.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
