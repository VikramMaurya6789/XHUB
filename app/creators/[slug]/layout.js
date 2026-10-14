export async function generateMetadata({ params }) {
  const { slug } = await params;
  const name = (slug || '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return {
    title: `${name} — Creator Channel | XHUB`,
    description: `Official channel videos and uploaded scenes by ${name} on XHUB.`,
  };
}

export default function CreatorSlugLayout({ children }) {
  return children;
}
