import { VERSION } from "lasttouch/server";

export default function HomePage() {
  return (
    <main className="page">
      <h1>Nightjar Live</h1>
      <p>
        A fictional ticket seller for trying LastTouch. Concerts, seats and
        checkout are coming in the next milestones.
      </p>
      <hr />
      <p className="meta">
        Skeleton build. <code>lasttouch</code> version{" "}
        <span data-testid="lasttouch-version">{VERSION}</span> is wired in.
      </p>
    </main>
  );
}
