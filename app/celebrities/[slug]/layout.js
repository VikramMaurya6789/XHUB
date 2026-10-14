export async function generateMetadata({ params }) {
  const { slug } = await params;
  const name = (slug || '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return {
    title: `${name} — Celebrity Archive & Leaks | XHUB`,
    description: `Celebrity videos, archives, and tapes featuring ${name} on XHUB.`,
  };
}

export default function CelebritySlugLayout({ children }) {
  return children;
}
