"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, Lock, Unlock, Minimize2, Image as ImageIcon, Layers, Trash2, X } from 'lucide-react';
import { BaseElement } from '../types/BaseElement';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useI18n } from '@/i18n/client';
import { getSelectedIds, toggleId } from '../editor/utils/selectionUtils';
import { fileAPI, type ProjectFileItem } from '@/lib/file-api';

interface HierarchyPanelProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  projectId?: string;
}

export default function HierarchyPanel({ isCollapsed, toggleSidebar, projectId }: HierarchyPanelProps) {
  const { t } = useI18n();
  const { 
    elements = [], 
    selectedId = null, 
    selectedIds = [], 
    selectElement = () => {}, 
    selectElements = () => {},
    updateElement = () => {}, 
    removeElement,
    updateSelectionBoundingBox = () => {}
  } = useWorkspaceStore();
  
  const [activeTab, setActiveTab] = useState<'layers' | 'assets'>('layers');
  const [assetQuery, setAssetQuery] = useState('');
  const [assetLoading, setAssetLoading] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<ProjectFileItem[]>([]);
  const [previewFile, setPreviewFile] = useState<ProjectFileItem | null>(null);

  const numericProjectId = useMemo(() => {
    const raw = projectId?.trim() ?? '';
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isInteger(parsed) || parsed <= 0) return null;
    return parsed;
  }, [projectId]);

  const loadAssets = useCallback(async () => {
    if (!numericProjectId) {
      setImageFiles([]);
      setAssetError(null);
      return;
    }
    setAssetLoading(true);
    setAssetError(null);
    try {
      const data = await fileAPI.listProjectFiles(numericProjectId, { page: 1, pageSize: 500 });
      const images = (data.list || []).filter((item) => item.fileCategory === 'image');
      setImageFiles(images);
    } catch (error) {
      setImageFiles([]);
      setAssetError(error instanceof Error ? error.message : String(error));
    } finally {
      setAssetLoading(false);
    }
  }, [numericProjectId]);

  useEffect(() => {
    if (activeTab !== 'assets') return;
    void loadAssets();
  }, [activeTab, loadAssets]);

  const filteredImageFiles = useMemo(() => {
    const query = assetQuery.trim().toLowerCase();
    if (!query) return imageFiles;
    return imageFiles.filter((file) => file.name.toLowerCase().includes(query));
  }, [assetQuery, imageFiles]);

  const handleLayerClick = (e: React.MouseEvent, elementId: string) => {
    if (e.shiftKey) {
      selectElements(toggleId(getSelectedIds(selectedId, selectedIds), elementId));
    } else {
      // Single selection
      selectElement(elementId);
    }
    updateSelectionBoundingBox();
  };
  
  const handleDeleteLayer = async (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    removeElement(elementId);
  };
  
  if (isCollapsed) { 
    return (
      <button 
        onClick={toggleSidebar}
        className="w-10 h-10 flex items-center justify-center z-50 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all shadow-md bg-white border border-gray-100"
        title={t("hierarchy.show_layers")}
      >
        {activeTab === 'assets' ? <ImageIcon size={20} /> : <Layers size={20} />}
      </button>
    );
  }

  return (
    <>
      <div className="w-[260px] bg-white border border-gray-100 flex flex-col h-full transition-all duration-300 relative select-none rounded-3xl shadow-lg overflow-hidden">
        <div className="p-3 pb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('layers')}
                className={[
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                  activeTab === 'layers'
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-500 hover:text-gray-700',
                ].join(' ')}
              >
                <Layers size={14} />
                {t('workspace.layers')}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('assets')}
                className={[
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                  activeTab === 'assets'
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-500 hover:text-gray-700',
                ].join(' ')}
              >
                <ImageIcon size={14} />
                {t('workspace.assets')}
              </button>
            </div>

            {activeTab === 'assets' ? (
              <button
                type="button"
                onClick={() => void loadAssets()}
                disabled={assetLoading}
                className="text-xs text-blue-600 hover:text-blue-700 hover:underline disabled:opacity-60"
              >
                {t('chat.history_refresh')}
              </button>
            ) : (
              <span className="text-xs text-gray-500">
                {t('hierarchy.title', { count: elements.length })}
              </span>
            )}
          </div>
        </div>

        {activeTab === 'layers' ? (
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
            {elements
              .slice()
              .reverse()
              .map((el) => {
                const isSelected = selectedId === el.id || selectedIds.includes(el.id);
                return (
                  <LayerItem
                    key={el.id}
                    element={el}
                    active={isSelected}
                    t={t}
                    onClick={(e) => handleLayerClick(e, el.id)}
                    onToggleVisible={(e) => {
                      e.stopPropagation();
                      updateElement(el.id, { visible: !el.visible });
                    }}
                    onToggleLock={(e) => {
                      e.stopPropagation();
                      if (!el.locked && selectedId === el.id) {
                        selectElement(null);
                      }
                      updateElement(el.id, { locked: !el.locked });
                    }}
                    onDelete={(e) => handleDeleteLayer(e, el.id)}
                  />
                );
              })}
            {elements.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-4">
                {t('hierarchy.empty')}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="px-3 pb-2">
              <input
                type="text"
                value={assetQuery}
                onChange={(e) => setAssetQuery(e.target.value)}
                placeholder={t('workspace.assets_search_placeholder')}
                className="w-full bg-gray-50 border-none rounded-lg px-3 py-2 text-xs text-gray-700 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-3">
              {numericProjectId ? null : (
                <div className="text-center text-gray-400 text-sm py-4">
                  {t('workspace.assets_empty')}
                </div>
              )}

              {numericProjectId && assetLoading ? (
                <div className="text-xs text-gray-500 py-4">{t('workspace.loading')}</div>
              ) : null}

              {numericProjectId && assetError ? (
                <div className="text-xs p-2 rounded-lg bg-red-50 text-red-700 border border-red-100">
                  {t('workspace.assets_load_failed')}: {assetError}
                </div>
              ) : null}

              {numericProjectId && !assetLoading && !assetError ? (
                filteredImageFiles.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {filteredImageFiles.map((file) => {
                      const src = `/api/files/${file.id}/content?versionId=${file.currentVersionId}`;
                      return (
                        <button
                          key={file.id}
                          type="button"
                          onClick={() => setPreviewFile(file)}
                          className="group rounded-xl border border-gray-200 bg-white overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all text-left"
                          title={file.name}
                        >
                          <div className="aspect-square bg-gray-50 overflow-hidden flex items-center justify-center">
                            <img
                              src={src}
                              alt={file.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <div className="px-2 py-2">
                            <div className="text-xs font-medium text-gray-700 truncate">{file.name}</div>
                            <div className="text-[10px] text-gray-400 truncate">{file.fileFormat.toUpperCase()}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center text-gray-400 text-sm py-6">
                    {t('workspace.assets_empty')}
                  </div>
                )
              ) : null}
            </div>
          </div>
        )}

        <div className="p-3 border-t border-gray-100 mt-auto">
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-start px-2 py-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-lg transition-colors"
            title={t('hierarchy.hide')}
          >
            <Minimize2 size={20} />
          </button>
        </div>
      </div>

      {previewFile ? (
        <div
          className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-6"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">{previewFile.name}</div>
                <div className="text-xs text-gray-500 truncate">
                  {previewFile.sizeBytes.toLocaleString()} bytes · v{previewFile.versionNumber}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                title={t('workspace.close')}
              >
                <X size={18} />
              </button>
            </div>
            <div className="bg-black flex items-center justify-center">
              <img
                src={`/api/files/${previewFile.id}/content?versionId=${previewFile.currentVersionId}`}
                alt={previewFile.name}
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function LayerItem({ 
  element, 
  active, 
  t,
  onClick,
  onToggleVisible,
  onToggleLock,
  onDelete
}: { 
  element: BaseElement<any>, 
  active: boolean, 
  t: (key: string, values?: Record<string, string | number>) => string;
  onClick: (e: React.MouseEvent) => void,
  onToggleVisible: (e: React.MouseEvent) => void,
  onToggleLock: (e: React.MouseEvent) => void,
  onDelete: (e: React.MouseEvent) => void
}) {
  // Determine icon/image based on type
  const isImage = element.type === 'image';
  const imageUrl = isImage ? (element as any).src : null;

  return (
    <div 
      onClick={onClick}
      className={`
      flex items-center gap-3 p-2 rounded-xl border transition-all cursor-pointer group
      ${active 
        ? 'bg-gray-100 border-gray-100 shadow-sm' 
        : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-100'
      }
    `}>
      <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 overflow-hidden flex-shrink-0 relative flex items-center justify-center">
        {imageUrl ? (
           <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${imageUrl})` }} />
        ) : (
           <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: (element as any).color || '#ccc' }}></div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium truncate ${active ? 'text-gray-900' : 'text-gray-600'}`}>
          {element.name}
        </div>
        <div className="text-xs text-gray-400">{t(`hierarchy.type.${element.type}`)}</div>
      </div>

      <div className="flex items-center gap-1">
        <button 
          onClick={onDelete}
          className={`p-1 rounded-md hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors
            opacity-0 group-hover:opacity-100
          `}
          title={t("hierarchy.delete")}
        >
          <Trash2 size={14} />
        </button>
        <button 
          onClick={onToggleLock}
          className={`p-1 rounded-md hover:bg-gray-200 text-gray-400 transition-colors
            ${element.locked ? 'text-orange-500 opacity-100' : 'opacity-0 group-hover:opacity-100'}
          `}
          title={element.locked ? t("hierarchy.unlock") : t("hierarchy.lock")}
        >
          {element.locked ? <Lock size={14} /> : <Unlock size={14} />}
        </button>
        <button 
          onClick={onToggleVisible}
          className={`p-1 rounded-md hover:bg-gray-200 text-gray-400 transition-colors
            ${!element.visible ? 'text-gray-500 opacity-100' : 'opacity-0 group-hover:opacity-100'}
          `}
          title={element.visible ? t("hierarchy.hide") : t("hierarchy.show")}
        >
          {element.visible ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
      </div>
    </div>
  )
}
