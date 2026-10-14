export async function generateMetadata({ params }) {
  const { slug } = await params;
  const name = (slug || '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return {
    title: `${name} — Pornstar Profile & Videos | XHUB`,
    description: `Watch official performer videos and HD scenes starring ${name} on XHUB.`,
  };
}

export default function PornstarSlugLayout({ children }) {
  return children;
}
