import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const platform = searchParams.get('platform') ?? 'courtlistener';

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required.' }, { status: 400 });
  }

  switch (platform) {
    case 'courtlistener':
      return searchCourtListener(query);
    case 'govinfo':
      return searchGovInfo(query);
    case 'scholar':
      return searchGoogleScholar(query);
    default:
      return NextResponse.json({ error: `Unknown platform: "${platform}"` }, { status: 400 });
  }
}

// ── CourtListener — US Federal & State Court Opinions ─────────────────────────

async function searchCourtListener(query: string) {
  const apiKey = process.env.COURTLISTENER_API_KEY;

  if (!apiKey || apiKey === 'your_courtlistener_api_key_here') {
    return NextResponse.json(
      {
        error:
          'CourtListener API key is not configured. Add COURTLISTENER_API_KEY to .env.local — get a free token at courtlistener.com/profile/',
        results: [],
      },
      { status: 401 }
    );
  }

  try {
    const url = new URL('https://www.courtlistener.com/api/rest/v3/search/');
    url.searchParams.set('q', query);
    url.searchParams.set('type', 'o');
    url.searchParams.set('order_by', 'score desc');

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[CourtListener]', response.status, text);
      return NextResponse.json(
        { error: `CourtListener returned HTTP ${response.status}. Verify your API key is valid.` },
        { status: response.status }
      );
    }

    const data = await response.json();

    const results = (data.results ?? []).map((r: any) => ({
      id: String(r.id ?? Math.random()),
      caseName: r.caseName ?? r.case_name ?? 'Unknown Case',
      citation: Array.isArray(r.citation)
        ? (r.citation[0] ?? '')
        : (r.citation ?? ''),
      court: r.court_exact ?? r.court ?? r.court_id ?? 'Unknown Court',
      dateFiled: r.dateFiled ?? r.date_filed ?? '',
      snippet: r.snippet ?? '',
      absoluteUrl: r.absolute_url
        ? `https://www.courtlistener.com${r.absolute_url}`
        : null,
      status: r.status ?? '',
      judges: r.judge ?? '',
    }));

    return NextResponse.json({
      platform: 'courtlistener',
      count: data.count ?? results.length,
      results,
    });
  } catch (err) {
    console.error('[CourtListener] fetch error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while querying CourtListener.' },
      { status: 500 }
    );
  }
}

// ── GovInfo — US Code & CFR only (POST JSON body required) ───────────────────

async function searchGovInfo(query: string) {
  const apiKey = process.env.GOVINFO_API_KEY ?? 'DEMO_KEY';

  // GovInfo /search requires POST with JSON body — GET returns 400.
  // We restrict to USCODE + CFR for genuine legal documents; omit FR/CPD
  // which return unrelated presidential speeches for generic queries.
  const body = {
    query,
    pageSize: 10,
    offsetMark: '*',
    collection: ['USCODE', 'CFR'],
    sortBy: 'relevance',
  };

  try {
    const response = await fetch(
      `https://api.govinfo.gov/search?api_key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error('[GovInfo]', response.status, text);
      return NextResponse.json(
        { error: `GovInfo API returned HTTP ${response.status}: ${text}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Each result has: title, packageId, granuleId, collectionCode,
    // dateIssued, resultLink, download (pdfLink, txtLink, ...)
    const results = (data.results ?? []).map((r: any) => {
      const id = r.granuleId ?? r.packageId ?? String(Math.random());
      // Prefer granule detail page; fall back to package page
      const detailsLink = r.granuleId
        ? `https://www.govinfo.gov/app/details/${r.packageId}/${r.granuleId}`
        : r.packageId
        ? `https://www.govinfo.gov/app/details/${r.packageId}`
        : null;

      return {
        id,
        title: r.title ?? 'Untitled Document',
        collectionCode: r.collectionCode ?? '',
        collectionName: r.collectionName ?? '',
        dateIssued: r.dateIssued ?? '',
        detailsLink,
        packageId: r.packageId ?? '',
        granuleId: r.granuleId ?? '',
        pdfLink: r.download?.pdfLink
          ? `${r.download.pdfLink}?api_key=${apiKey}`
          : null,
      };
    });

    return NextResponse.json({
      platform: 'govinfo',
      count: data.count ?? results.length,
      results,
    });
  } catch (err) {
    console.error('[GovInfo] fetch error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while querying GovInfo.' },
      { status: 500 }
    );
  }
}

// ── Google Scholar — via SerpApi free tier (250 searches/month, $0) ───────────

async function searchGoogleScholar(query: string) {
  const apiKey = process.env.SERPAPI_KEY;

  if (!apiKey || apiKey === 'your_serpapi_key_here') {
    return NextResponse.json(
      {
        error:
          'SerpApi key not configured. Get a FREE key (250 searches/month, no credit card) at serpapi.com — then add SERPAPI_KEY to .env.local',
        results: [],
      },
      { status: 401 }
    );
  }

  try {
    const url = new URL('https://serpapi.com/search');
    url.searchParams.set('engine', 'google_scholar');
    url.searchParams.set('q', query);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('num', '10');
    url.searchParams.set('hl', 'en');

    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[Scholar]', response.status, text);
      return NextResponse.json(
        { error: `Google Scholar returned HTTP ${response.status}.` },
        { status: response.status }
      );
    }

    const data = await response.json();

    const results = (data.organic_results ?? []).map((r: any) => ({
      id: r.result_id ?? String(Math.random()),
      title: r.title ?? 'Untitled',
      link: r.link ?? null,
      snippet: r.snippet ?? '',
      authors: Array.isArray(r.publication_info?.authors)
        ? r.publication_info.authors.map((a: any) => a.name).join(', ')
        : (r.publication_info?.summary ?? ''),
      year: r.inline_links?.cited_by?.total
        ? `Cited by ${r.inline_links.cited_by.total}`
        : '',
      pdfLink: r.resources?.find((x: any) => x.file_format === 'PDF')?.link ?? null,
    }));

    return NextResponse.json({
      platform: 'scholar',
      count: data.search_information?.total_results ?? results.length,
      results,
    });
  } catch (err) {
    console.error('[Scholar] fetch error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while querying Google Scholar.' },
      { status: 500 }
    );
  }
}
