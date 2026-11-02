const links = [
  { label: "Privacy", href: "/privacy", internal: true },
  { label: "GitHub", href: "https://github.com/nishachay/hackerx", internal: false },
];

export function Credit() {
  return (
    <div className="credit">
      <span>
        Made by{" "}
        <a href="https://nishachay.tech" rel="noopener">
          Nishachay
        </a>
      </span>
      <span className="credit-links">
        {links.map((link) =>
          link.internal ? (
            <a key={link.label} href={link.href}>
              {link.label}
            </a>
          ) : (
            <a key={link.label} href={link.href} target="_blank" rel="noopener">
              {link.label}
            </a>
          ),
        )}
      </span>
      <span className="credit-note">Independent project. Not affiliated with X Corp. or Hacker News.</span>
    </div>
  );
}
