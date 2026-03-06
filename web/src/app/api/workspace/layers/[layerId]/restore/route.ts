import { NextRequest, NextResponse } from 'next/server';
import { fetchSparkxJson } from '@/lib/sparkx-api';
import { getSparkxSessionFromHeaders } from '@/lib/sparkx-session';

interface LayerRestoreResponse {
  restored: boolean;
  restoredAt: string;
}

// POST /api/workspace/layers/:layerId/restore
export async function POST(
  request: NextRequest,
  { params }: { params: { layerId: string } }
) {
  try {
    const session = getSparkxSessionFromHeaders(request.headers);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const layerId = params.layerId;

    const result = await fetchSparkxJson<LayerRestoreResponse>(
      `/api/v1/layers/${layerId}/restore`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
        },
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
    console.error('Error restoring layer:', error);
    return NextResponse.json(
      { error: 'Failed to restore layer' },
      { status: 500 }
    );
  }
}
