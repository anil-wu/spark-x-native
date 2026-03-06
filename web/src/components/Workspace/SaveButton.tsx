"use client";

import React from 'react';
import { Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useI18n } from '@/i18n/client';

interface SaveButtonProps {
  saveStatus: 'idle' | 'saving' | 'saved' | 'error' | 'conflict';
  lastSavedAt: Date | null;
  onSave: () => void;
  errorMessage?: string | null;
}

export default function SaveButton({
  saveStatus,
  lastSavedAt,
  onSave,
  errorMessage,
}: SaveButtonProps) {
  const { t } = useI18n();

  const getStatusText = () => {
    switch (saveStatus) {
      case 'saving':
        return t('workspace.saving');
      case 'saved':
        return t('workspace.saved');
      case 'error':
        return t('workspace.save_error');
      case 'conflict':
        return t('workspace.conflict');
      default:
        return t('workspace.save');
    }
  };

  const getStatusIcon = () => {
    switch (saveStatus) {
      case 'saving':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'saved':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'conflict':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Save className="h-4 w-4" />;
    }
  };

  const formatLastSaved = (date: Date | null) => {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return t('workspace.just_now');
    if (minutes === 1) return t('workspace.minute_ago');
    if (minutes < 60) return t('workspace.minutes_ago', { count: minutes });
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return t('workspace.hour_ago');
    if (hours < 24) return t('workspace.hours_ago', { count: hours });
    
    return date.toLocaleString();
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={onSave}
        disabled={saveStatus === 'saving'}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          saveStatus === 'saved'
            ? 'bg-green-50 text-green-700'
            : saveStatus === 'error'
            ? 'bg-red-50 text-red-700'
            : saveStatus === 'conflict'
            ? 'bg-yellow-50 text-yellow-700'
            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
        } disabled:opacity-50 disabled:cursor-not-allowed shadow-sm`}
        title={saveStatus === 'error' ? errorMessage || '' : undefined}
      >
        {getStatusIcon()}
        <span>{getStatusText()}</span>
      </button>
      
      {lastSavedAt && saveStatus !== 'saving' && (
        <span className="text-[10px] text-slate-500 bg-white/50 px-1.5 py-0.5 rounded backdrop-blur-sm">
          {t('workspace.last_saved')}: {formatLastSaved(lastSavedAt)}
        </span>
      )}
    </div>
  );
}
