import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fileId = searchParams.get('file_id');
  const token = searchParams.get('token');

  if (!fileId || !token) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://csv.mnr.world/api/index.php?route=questions&file_id=${fileId}&token=${token}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch from external API' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('Proxy Error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
