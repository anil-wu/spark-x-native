"use client";

import React, { useState, useEffect } from 'react';
import { Trash2, RotateCcw, X, Clock, User } from 'lucide-react';
import { useI18n } from '@/i18n/client';
import { workspaceAPI, DeletedLayer } from '@/lib/workspace-api';

interface RecycleBinPanelProps {
  canvasId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onRestore: (layerId: number) => void;
}

export default function RecycleBinPanel({
  canvasId,
  isOpen,
  onClose,
  onRestore,
}: RecycleBinPanelProps) {
  const { t } = useI18n();
  const [deletedLayers, setDeletedLayers] = useState<DeletedLayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && canvasId) {
      fetchDeletedLayers();
    }
  }, [isOpen, canvasId]);

  const fetchDeletedLayers = async () => {
    if (!canvasId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await workspaceAPI.getDeletedLayers(canvasId, 50);
      setDeletedLayers(data.deletedLayers);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('workspace.load_deleted_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (layerId: number) => {
    try {
      await workspaceAPI.restoreLayer(layerId);
      setDeletedLayers((prev) => prev.filter((l) => l.id !== layerId));
      onRestore(layerId);
    } catch (err) {
      console.error('Failed to restore layer:', err);
    }
  };

  const formatDeletedAt = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              {t('workspace.recycle_bin')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">{t('workspace.loading')}</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-red-600">{error}</div>
            </div>
          ) : deletedLayers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Trash2 className="h-12 w-12 mb-4 opacity-20" />
              <p>{t('workspace.recycle_bin_empty')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {deletedLayers.map((layer) => (
                <div
                  key={layer.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-white rounded border border-gray-200 flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600 uppercase">
                          {layer.layerType.slice(0, 3)}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {layer.name}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          {formatDeletedAt(layer.deletedAt)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <User className="h-3 w-3" />
                          {t('workspace.deleted_by', { id: layer.deletedBy })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRestore(layer.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {t('workspace.restore')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{t('workspace.total_deleted')}: {deletedLayers.length}</span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              {t('workspace.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
