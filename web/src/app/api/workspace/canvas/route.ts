import { NextRequest, NextResponse } from 'next/server';
import { fetchSparkxJson } from '@/lib/sparkx-api';
import { getSparkxSessionFromHeaders } from '@/lib/sparkx-session';

interface CanvasData {
  id: number;
  projectId: number;
  name: string;
  backgroundColor: string;
  metadata?: {
    gridSize?: number;
    snapEnabled?: boolean;
  };
  createdAt: string;
  updatedAt: string;
  createdBy: number;
}

interface LayerData {
  id: number;
  canvasId: number;
  layerType: string;
  name: string;
  zIndex: number;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  rotation: number;
  visible: boolean;
  locked: boolean;
  properties: Record<string, any>;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
}

interface CanvasResponse {
  canvas: CanvasData | null;
  layers: LayerData[];
}

// GET /api/workspace/canvas?projectId=123
export async function GET(request: NextRequest) {
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

    const result = await fetchSparkxJson<CanvasResponse>(
      `/api/v1/projects/${projectId}/canvas`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
        },
      }
    );

    if (!result.ok) {
      return NextResponse.json(
        { error: result.message },
        { status: result.status === 404 ? 404 : 500 }
      );
    }
    console.log('canvas------------->', result.data);
    for (const layer of result.data.layers) {
      // layer.properties = JSON.parse(layer.properties);
      console.log('layer.properties------------->', layer.layerType, layer.name, layer.properties);
    }
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error fetching canvas:', error);
    return NextResponse.json(
      { error: 'Failed to fetch canvas' },
      { status: 500 }
    );
  }
}

// POST /api/workspace/canvas
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
    const result = await fetchSparkxJson<{ id: number }>(
      `/api/v1/projects/${projectId}/canvas`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify(body),
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
    console.error('Error creating canvas:', error);
    return NextResponse.json(
      { error: 'Failed to create canvas' },
      { status: 500 }
    );
  }
}
