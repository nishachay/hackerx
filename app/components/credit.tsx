const links = [
  { label: "X", href: "https://x.com/ni5hachay" },
  { label: "GitHub", href: "https://github.com/nishachay/hackerx" },
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
        {links.map((link) => (
          <a key={link.label} href={link.href} target="_blank" rel="noopener">
            {link.label}
          </a>
        ))}
      </span>
    </div>
  );
}
