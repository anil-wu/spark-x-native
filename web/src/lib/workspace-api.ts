export interface Canvas {
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

export interface Layer {
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
  fileId?: number;
  deleted: boolean;
  deletedAt?: string;
  deletedBy?: number;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
}

export interface LayerSyncRequest {
  id?: string;
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
  fileId?: number;
}

export interface LayerSyncResponse {
  uploaded: number;
  updated: number;
  skipped: number;
  layerMapping: Record<string, number>;
}

export interface DeletedLayer {
  id: number;
  name: string;
  layerType: string;
  deletedAt: string;
  deletedBy: number;
}

export interface CanvasResponse {
  canvas: Canvas;
  layers: Layer[];
}

export interface DeletedLayersResponse {
  deletedLayers: DeletedLayer[];
  total: number;
}

export interface RestoreLayerResponse {
  layerId: number;
  restored: boolean;
  restoredAt: string;
}

export interface DeleteLayerResponse {
  layerId: number;
  deleted: boolean;
  deletedAt: string;
}

export class WorkspaceAPI {
  async getCanvas(projectId: number): Promise<CanvasResponse | null> {
    const response = await fetch(`/api/workspace/canvas?projectId=${projectId}`, {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const error = await response.text();
      throw new Error(`Failed to get canvas: ${error}`);
    }

    return response.json();
  }

  async createCanvas(
    projectId: number,
    data: {
      name?: string;
      backgroundColor?: string;
      metadata?: {
        gridSize?: number;
        snapEnabled?: boolean;
      };
    }
  ): Promise<number> {
    const response = await fetch(`/api/workspace/canvas?projectId=${projectId}`, {
      method: 'POST',
      body: JSON.stringify({
        name: data.name || 'Main Canvas',
        backgroundColor: data.backgroundColor || '#ffffff',
        metadata: data.metadata,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create canvas: ${error}`);
    }

    const result = await response.json();
    return result.data.canvasId;
  }

  async syncLayers(
    projectId: number,
    layers: LayerSyncRequest[]
  ): Promise<LayerSyncResponse> {
    const response = await fetch(`/api/workspace/layers/sync?projectId=${projectId}`, {
      method: 'POST',
      body: JSON.stringify({ layers }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to sync layers: ${error}`);
    }

    return response.json();
  }

  async updateLayer(
    layerId: number,
    updates: {
      name?: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      rotation?: number;
      visible?: boolean;
      locked?: boolean;
      properties?: Record<string, any>;
    }
  ): Promise<void> {
    const response = await fetch(`/api/workspace/layers/${layerId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update layer: ${error}`);
    }
  }

  async deleteLayer(layerId: number): Promise<DeleteLayerResponse> {
    const response = await fetch(`/api/workspace/layers/${layerId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete layer: ${error}`);
    }

    return response.json();
  }

  async restoreLayer(layerId: number): Promise<RestoreLayerResponse> {
    const response = await fetch(`/api/workspace/layers/${layerId}/restore`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to restore layer: ${error}`);
    }

    return response.json();
  }

  async getDeletedLayers(
    canvasId: number,
    limit: number = 50
  ): Promise<DeletedLayersResponse> {
    const response = await fetch(`/api/workspace/layers/deleted?canvasId=${canvasId}&limit=${limit}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get deleted layers: ${error}`);
    }

    return response.json();
  }
}

export const workspaceAPI = new WorkspaceAPI();
