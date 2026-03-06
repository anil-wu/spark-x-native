import { NextRequest, NextResponse } from 'next/server';
import { fetchSparkxJson } from '@/lib/sparkx-api';
import { getSparkxSessionFromHeaders } from '@/lib/sparkx-session';

interface LayerSyncRequest {
  id: string;
  layerType: string;
  name: string;
  zIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  visible: boolean;
  locked: boolean;
  properties: Record<string, any>;
}

interface LayerSyncResponse {
  uploaded: number;
  updated: number;
  skipped: number;
  layerMapping: Record<string, number>;
}

// POST /api/workspace/layers/sync?projectId=123
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const session = getSparkxSessionFromHeaders(request.headers);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { layers }: { layers: LayerSyncRequest[] } = body;

    console.log('layers------------->', layers);

    if (!layers || !Array.isArray(layers)) {
      return NextResponse.json(
        { error: 'layers array is required' },
        { status: 400 }
      );
    }

    const result = await fetchSparkxJson<LayerSyncResponse>(
      `/api/v1/projects/${projectId}/layers/sync`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ layers }),
      }
    );

    if (!result.ok) {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error syncing layers:', error);
    return NextResponse.json(
      { error: 'Failed to sync layers' },
      { status: 500 }
    );
  }
}
