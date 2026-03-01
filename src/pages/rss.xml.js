export const prerender = true;

export async function GET() {
  return new Response(
    '<message>RSS feed has been retired for this site.</message>',
    {
      status: 410,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    }
  );
}
