const topics = [
  { topic: "Programming", count: 84 },
  { topic: "Artificial intelligence", count: 61 },
  { topic: "Startups", count: 43 },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto grid min-h-screen max-w-[1280px] grid-cols-[250px_minmax(0,600px)_minmax(280px,1fr)]">
        <nav className="sticky top-0 flex h-screen flex-col border-r border-[var(--border)] px-5 py-3">
          <a className="mb-5 flex h-12 w-12 items-center justify-center rounded-full text-3xl font-black text-[var(--accent)]" href="#" aria-label="HackerX home">H</a>
          {["Home", "Explore", "Zen", "On this day", "History", "By Year", "Accounts", "How we pick", "More"].map((item, i) => (
            <a key={item} href={i === 7 ? "/how/" : "#"} className={`my-0.5 w-fit rounded-full px-3 py-2.5 text-xl ${i === 0 ? "font-bold" : "hover:bg-white/10"}`}>
              <span className="mr-4 inline-block w-7 text-center text-[var(--muted)]">{["⌂", "⌕", "◉", "◷", "▣", "▤", "♙", "ⓘ", "···"][i]}</span>{item}
            </a>
          ))}
          <a href="#random" className="mt-4 rounded-full bg-white px-6 py-3 text-center font-bold text-black">Random tweet</a>
          <div className="mt-auto rounded-2xl px-3 py-4"><b className="text-[var(--accent)]">H</b><span className="ml-3 font-bold">HackerX</span><p className="ml-7 text-xs text-[var(--muted)]">Not affiliated with X or Y Combinator</p></div>
        </nav>

        <section className="min-h-screen border-r border-[var(--border)]">
          <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-black/85 backdrop-blur">
            <div className="grid h-14 grid-cols-3 text-center font-semibold">
              {["For you", "Top", "Rising"].map((tab, i) => <a key={tab} href="#feed" className={`relative flex items-center justify-center ${i === 0 ? "after:absolute after:bottom-0 after:h-1 after:w-14 after:rounded-full after:bg-[var(--accent)]" : "text-[var(--muted)]"}`}>{tab}</a>)}
            </div>
          </header>
          <div className="border-b border-[var(--border)] px-4 py-5">
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--accent)]">Tweet of the Day</div>
            <p className="text-lg">The best ideas get better when they’re shared, discussed, and returned to over time.</p>
            <div className="mt-3 text-sm text-[var(--muted)]">A HackerX pick · 12 HN recommenders</div>
          </div>
          <div className="border-b border-[var(--border)] py-3 text-center text-sm text-[var(--accent)]">Show 12 new tweets</div>
          <article id="feed" className="border-b border-[var(--border)] px-4 py-4 hover:bg-white/[0.02]">
            <div className="flex gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--surface-raised)] font-bold text-[var(--accent)]">PK</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1"><b>Paul Graham</b><span className="text-[var(--muted)]">@paulg · 2010</span><span className="ml-auto text-[var(--accent)]">Y</span><button className="px-1 text-[var(--muted)]" aria-label="More options">···</button></div>
                <p className="mt-1 text-[15px] leading-[1.4]">The most important thing is to have a good idea. A good idea is one that people want, and that you can actually build.</p>
                <p className="mt-2 text-xs text-[var(--muted)]">“This is still the best short explanation of why startups work.”</p>
                <div className="mt-4 flex justify-between text-sm text-[var(--muted)]"><span>◯ 128</span><span>↑ 942</span><button>♡ Like</button><span>▥ 18</span><button>▢ Save</button><span>↗</span></div>
              </div>
            </div>
          </article>
        </section>

        <aside className="hidden px-6 py-3 lg:block">
          <label className="mb-4 flex h-11 items-center rounded-full border border-[var(--border)] px-4 text-[var(--muted)]">⌕ <span className="ml-3">Search HackerX</span></label>
          <section className="mb-4 rounded-2xl border border-[var(--border)] p-4"><h2 className="text-xl font-bold">About HackerX</h2><p className="mt-2">Timeless tweets recommended by Hacker News readers.</p><a href="/how/" className="mt-4 inline-flex rounded-full bg-white px-4 py-2 font-bold text-black">How we pick</a></section>
          <section className="mb-4 rounded-2xl border border-[var(--border)] p-4"><h2 className="text-xl font-bold">Rising on HN</h2><p className="mt-4 font-bold">Why small tools can outlast entire platforms</p><p className="mt-2 text-sm text-[var(--muted)]">Rising · 9 HN recommenders</p></section>
          <section className="rounded-2xl border border-[var(--border)] p-4"><h2 className="mb-3 text-xl font-bold">Trending topics</h2>{topics.map(({ topic, count }) => <div key={topic} className="py-3"><div className="text-xs text-[var(--muted)]">Topic · Trending</div><b>{topic}</b><div className="text-xs text-[var(--muted)]">{count} tweets</div></div>)}</section>
          <footer className="mt-4 text-xs leading-6 text-[var(--muted)]">About · How we pick · Data · RSS · GitHub<br />© 2026 HackerX</footer>
        </aside>
      </div>
    </main>
  );
}
