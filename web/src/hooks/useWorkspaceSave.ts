import { useState, useCallback, useEffect } from 'react';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { workspaceAPI, LayerSyncRequest } from '@/lib/workspace-api';
import { BaseElement } from '@/components/Workspace/types/BaseElement';
import { useI18n } from '@/i18n/client';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'conflict';

interface SaveResult {
  success: boolean;
  uploaded: number;
  updated: number;
  skipped: number;
  error?: string;
}

interface OfflineOperation {
  type: 'sync';
  projectId: number;
  layers: LayerSyncRequest[];
  timestamp: number;
}

export function useWorkspaceSave(projectId: number) {
  const { t } = useI18n();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const elementsToLayerRequest = useCallback((elements: BaseElement<any>[]): LayerSyncRequest[] => {
    return elements.map((el, index) => {
      const state = el.toState();
      const properties = getPropertiesFromState(state);
      const request = {
        id: el.id,
        layerType: el.type,
        name: el.name,
        zIndex: index,
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        rotation: el.rotation,
        visible: el.visible,
        locked: el.locked,
        properties: properties,
      };
      console.log(`Layer ${el.id} (${el.type}) properties:`, properties);
      return request;
    });
  }, []);

  const getPropertiesFromState = (state: any): Record<string, any> => {
    const properties: Record<string, any> = {};

    if ('src' in state) properties.src = state.src;
    if ('color' in state) properties.color = state.color;
    if ('stroke' in state) properties.stroke = state.stroke;
    if ('strokeWidth' in state) properties.strokeWidth = state.strokeWidth;
    if ('strokeStyle' in state) properties.strokeStyle = state.strokeStyle;
    if ('cornerRadius' in state) properties.cornerRadius = state.cornerRadius;
    if ('text' in state) properties.text = state.text;
    if ('fontSize' in state) properties.fontSize = state.fontSize;
    if ('fontFamily' in state) properties.fontFamily = state.fontFamily;
    if ('textColor' in state) properties.textColor = state.textColor;
    if ('textStroke' in state) properties.textStroke = state.textStroke;
    if ('textStrokeWidth' in state) properties.textStrokeWidth = state.textStrokeWidth;
    if ('fontStyle' in state) properties.fontStyle = state.fontStyle;
    if ('align' in state) properties.align = state.align;
    if ('lineHeight' in state) properties.lineHeight = state.lineHeight;
    if ('letterSpacing' in state) properties.letterSpacing = state.letterSpacing;
    if ('textDecoration' in state) properties.textDecoration = state.textDecoration;
    if ('textTransform' in state) properties.textTransform = state.textTransform;
    if ('points' in state) properties.points = state.points;
    if ('fill' in state) properties.fill = state.fill;
    if ('opacity' in state) properties.opacity = state.opacity;
    if ('blendMode' in state) properties.blendMode = state.blendMode;
    if ('sides' in state) properties.sides = state.sides;
    if ('starInnerRadius' in state) properties.starInnerRadius = state.starInnerRadius;
    if ('tension' in state) properties.tension = state.tension;

    return properties;
  };

  const saveToOfflineQueue = useCallback((layers: LayerSyncRequest[]) => {
    const operation: OfflineOperation = {
      type: 'sync',
      projectId,
      layers,
      timestamp: Date.now(),
    };

    try {
      const queue = JSON.parse(localStorage.getItem('offlineSaveQueue') || '[]');
      queue.push(operation);
      localStorage.setItem('offlineSaveQueue', JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to save to offline queue:', error);
    }
  }, [projectId]);

  const syncOfflineChanges = useCallback(async () => {
    try {
      const queue = JSON.parse(localStorage.getItem('offlineSaveQueue') || '[]');
      if (queue.length === 0) return;

      for (const op of queue) {
        if (op.type === 'sync' && op.projectId === projectId) {
          await workspaceAPI.syncLayers(op.projectId, op.layers);
        }
      }

      localStorage.removeItem('offlineSaveQueue');
      console.log('Offline data synced successfully');
    } catch (error) {
      console.error('Failed to sync offline changes:', error);
      throw error;
    }
  }, [projectId]);

  const handleSave = useCallback(async (): Promise<SaveResult> => {
    const state = useWorkspaceStore.getState();
    const temporalState = useWorkspaceStore.temporal.getState();

    try {
      setSaveStatus('saving');
      setErrorMessage(null);

      temporalState.pause();

      const layers = elementsToLayerRequest(state.elements);
      
      // Debug log
      console.log('Syncing layers:', layers.map(l => ({
        id: l.id,
        name: l.name,
        type: l.layerType,
        zIndex: l.zIndex,
      })));
      
      let result;
      try {
        result = await workspaceAPI.syncLayers(projectId, layers);
      } catch (error) {
        if (error instanceof Error && error.message.includes('network')) {
          saveToOfflineQueue(layers);
          setSaveStatus('error');
          return {
            success: false,
            uploaded: 0,
            updated: 0,
            skipped: 0,
            error: t('workspace.network_error_offline'),
          };
        }
        throw error;
      }

      setSaveStatus('saved');
      setLastSavedAt(new Date());

      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);

      return {
        success: true,
        uploaded: result.uploaded,
        updated: result.updated,
        skipped: result.skipped,
      };
    } catch (error) {
      setSaveStatus('error');
      const errorMsg = error instanceof Error ? error.message : t('workspace.save_failed');
      setErrorMessage(errorMsg);

      return {
        success: false,
        uploaded: 0,
        updated: 0,
        skipped: 0,
        error: errorMsg,
      };
    } finally {
      const temporalState = useWorkspaceStore.temporal.getState();
      temporalState.resume();
    }
  }, [projectId, elementsToLayerRequest, saveToOfflineQueue]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  }, [handleSave]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const handleOnline = () => {
      syncOfflineChanges().catch(console.error);
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [syncOfflineChanges]);

  return {
    saveStatus,
    lastSavedAt,
    errorMessage,
    handleSave,
    syncOfflineChanges,
  };
}
