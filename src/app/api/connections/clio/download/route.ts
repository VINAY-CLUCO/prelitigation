import { NextResponse } from 'next/server';
import { getToken } from '@/lib/tokenStore';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const docId = url.searchParams.get('docId');

  if (!docId) {
    return NextResponse.json({ error: 'Missing docId parameter' }, { status: 400 });
  }

  const token = getToken('clio');
  if (!token?.access_token) {
    return NextResponse.json({ error: 'Clio is not connected' }, { status: 401 });
  }

  try {
    // Clio v4 document download endpoint
    const clioUrl = `https://app.clio.com/api/v4/documents/${docId}/download`;

    const response = await fetch(clioUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
      redirect: 'manual', // We want to catch the redirect URL to send it to the client
    });

    if (response.status === 302 || response.status === 303 || response.status === 307) {
      const location = response.headers.get('location');
      if (location) {
        return NextResponse.redirect(location);
      }
    } else if (response.ok) {
      // Sometimes it returns a JSON object with a URL depending on headers
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        if (data?.data?.url) {
          return NextResponse.redirect(data.data.url);
        }
      }
      
      // If it actually pipes the file directly
      return new NextResponse(response.body, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment`,
        }
      });
    }

    const errText = await response.text();
    throw new Error(`Clio API Error: ${response.status} - ${errText}`);
  } catch (error: any) {
    console.error('[Clio Download Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
