export async function generateMetadata({ params }) {
  const { slug } = await params;
  const name = (slug || '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  return {
    title: `${name} Channel — XHUB`,
    description: `Official studio releases and scenes from ${name} on XHUB.`,
  };
}

export default function ChannelSlugLayout({ children }) {
  return children;
}
