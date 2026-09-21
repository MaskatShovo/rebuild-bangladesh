export default function Loading() {
  return (
    <div className="container page" aria-busy="true">
      <p role="status">Finding your next good material…</p>
      <div className="skeleton" />
    </div>
  );
}
