export async function generateMetadata({ params }) {
  const { slug } = await params;
  const title = (slug || '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return {
    title: `${title} Videos — XHUB`,
    description: `Watch trending ${title} videos in HD on XHUB.`,
  };
}

export default function CategorySlugLayout({ children }) {
  return children;
}
