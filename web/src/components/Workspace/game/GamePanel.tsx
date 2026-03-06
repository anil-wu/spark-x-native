"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Play, Square, Monitor, Tag } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listProjectBuildVersions, type BuildVersionItem } from "@/lib/projects-api";

type GamePanelProps = {
  projectId?: string;
};

export default function GamePanel({ projectId }: GamePanelProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [resolution, setResolution] = useState("1920x1080");
  const [buildVersions, setBuildVersions] = useState<BuildVersionItem[]>([]);
  const [selectedBuildVersionId, setSelectedBuildVersionId] = useState<string | undefined>(
    undefined,
  );
  const [playingBuildVersionId, setPlayingBuildVersionId] = useState<string | null>(null);
  const [isLoadingBuildVersions, setIsLoadingBuildVersions] = useState(false);
  const [buildVersionsError, setBuildVersionsError] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [playingEntryUrl, setPlayingEntryUrl] = useState<string | null>(null);

  const stopPlay = () => {
    setIsPlaying(false);
    setIsLaunching(false);
    setLaunchError(null);
    setPlayingBuildVersionId(null);
    setPlayingEntryUrl(null);
  };

  const startPlay = async () => {
    if (isLaunching) return;
    if (!projectId) {
      setLaunchError("未选择项目");
      return;
    }
    if (!selectedBuildVersionId) {
      setLaunchError("请选择版本");
      return;
    }
    const buildVersion = buildVersions.find(
      (item) => String(item.buildVersionId) === selectedBuildVersionId,
    );
    if (!buildVersion) {
      setLaunchError("版本不存在或已变更，请刷新后重试");
      return;
    }

    setIsLaunching(true);
    setLaunchError(null);
    setPlayingEntryUrl(null);

    try {
      setPlayingBuildVersionId(selectedBuildVersionId);
      setPlayingEntryUrl(
        `/api/v1/previews/builds/${buildVersion.buildVersionId}/`,
      );
      setIsPlaying(true);
    } catch (error) {
      stopPlay();
      setLaunchError(error instanceof Error ? error.message : "启动失败");
    } finally {
      setIsLaunching(false);
    }
  };

  useEffect(() => {
    if (!projectId) {
      setBuildVersions([]);
      setSelectedBuildVersionId(undefined);
      setBuildVersionsError(null);
      stopPlay();
      return;
    }

    let cancelled = false;
    setIsLoadingBuildVersions(true);
    setBuildVersionsError(null);

    listProjectBuildVersions(projectId, 1, 200)
      .then((list) => {
        if (cancelled) return;
        setBuildVersions(list);

        const latest = list.reduce<BuildVersionItem | null>((acc, current) => {
          if (!acc) return current;
          if (current.versionNumber > acc.versionNumber) return current;
          if (current.versionNumber < acc.versionNumber) return acc;
          const currentTime = Date.parse(current.createdAt);
          const accTime = Date.parse(acc.createdAt);
          if (Number.isFinite(currentTime) && Number.isFinite(accTime)) {
            return currentTime > accTime ? current : acc;
          }
          return current;
        }, null);

        setSelectedBuildVersionId((prev) => {
          if (prev && list.some((item) => String(item.buildVersionId) === prev)) {
            return prev;
          }
          return latest ? String(latest.buildVersionId) : undefined;
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setBuildVersions([]);
        setSelectedBuildVersionId(undefined);
        setBuildVersionsError(error instanceof Error ? error.message : "加载版本失败");
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoadingBuildVersions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const latestBuildVersionId = useMemo(() => {
    const latest = buildVersions.reduce<BuildVersionItem | null>((acc, current) => {
      if (!acc) return current;
      if (current.versionNumber > acc.versionNumber) return current;
      if (current.versionNumber < acc.versionNumber) return acc;
      const currentTime = Date.parse(current.createdAt);
      const accTime = Date.parse(acc.createdAt);
      if (Number.isFinite(currentTime) && Number.isFinite(accTime)) {
        return currentTime > accTime ? current : acc;
      }
      return current;
    }, null);
    return latest ? String(latest.buildVersionId) : undefined;
  }, [buildVersions]);

  const selectedBuildVersion = useMemo(() => {
    if (!selectedBuildVersionId) return null;
    return (
      buildVersions.find(
        (item) => String(item.buildVersionId) === selectedBuildVersionId,
      ) ?? null
    );
  }, [buildVersions, selectedBuildVersionId]);

  const playingBuildVersion = useMemo(() => {
    const buildVersionId = playingBuildVersionId ?? selectedBuildVersionId;
    if (!buildVersionId) return null;
    return buildVersions.find((item) => String(item.buildVersionId) === buildVersionId) ?? null;
  }, [buildVersions, playingBuildVersionId, selectedBuildVersionId]);

  return (
    <div className="flex flex-col h-full w-full bg-gray-100">
      {/* Toolbar */}
      <div className="flex justify-start p-2 shrink-0">
        <div className="flex items-center gap-4 px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
          <button
            onClick={() => {
              if (isPlaying || isLaunching) {
                stopPlay();
              } else {
                void startPlay();
              }
            }}
            disabled={isLoadingBuildVersions || !projectId}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isPlaying 
                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {isPlaying ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            {isLaunching ? "Loading..." : isPlaying ? "Stop" : "Play"}
          </button>

          <div className="h-6 w-px bg-gray-200 mx-2" />

          <div className="flex items-center gap-2">
              <Monitor size={16} className="text-gray-500" />
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger className="h-8 w-[180px] border-gray-200 bg-gray-50 text-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1920x1080">1920 x 1080 (FHD)</SelectItem>
                  <SelectItem value="1280x720">1280 x 720 (HD)</SelectItem>
                  <SelectItem value="800x600">800 x 600</SelectItem>
                  <SelectItem value="mobile">Mobile (375x667)</SelectItem>
                </SelectContent>
              </Select>
          </div>

          <div className="h-6 w-px bg-gray-200 mx-2" />

          <div className="flex items-center gap-2">
            <Tag size={16} className="text-gray-500" />
            <Select
              value={selectedBuildVersionId}
              onValueChange={(value) => {
                setSelectedBuildVersionId(value);
                if (isPlaying || isLaunching) stopPlay();
              }}
            >
              <SelectTrigger
                className="h-8 w-[240px] border-gray-200 bg-gray-50 text-gray-700"
                disabled={!projectId || isLoadingBuildVersions || buildVersions.length === 0 || isLaunching}
              >
                <SelectValue
                  placeholder={
                    !projectId
                      ? "未选择项目"
                      : isLoadingBuildVersions
                        ? "加载中..."
                        : buildVersions.length === 0
                          ? "暂无版本"
                          : "请选择版本"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {buildVersions.map((item) => {
                  const isLatest = latestBuildVersionId === String(item.buildVersionId);
                  const label = `v${item.versionNumber}${isLatest ? "（最新）" : ""}`;
                  const description = item.description?.trim();
                  return (
                    <SelectItem key={item.buildVersionId} value={String(item.buildVersionId)}>
                      {description ? `${label} - ${description}` : label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Game Display Area */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-hidden bg-gray-200/50">
        <div 
            className="bg-black shadow-2xl relative transition-all duration-300"
            style={{
                aspectRatio: resolution === "mobile" ? "375/667" : resolution.replace("x", "/"),
                width: resolution === "mobile" ? "auto" : "100%",
                height: resolution === "mobile" ? "100%" : "auto",
                maxWidth: "100%",
                maxHeight: "100%",
            }}
        >
          {isPlaying && playingEntryUrl ? (
            <iframe
              src={playingEntryUrl}
              className="absolute inset-0 h-full w-full border-0"
              title="Game Preview"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/20">
              <div className="text-center">
                <p className="text-xl">{isLaunching ? "Loading..." : "Game Paused"}</p>
                {!isLaunching && <p className="text-sm mt-2">Press Play to start</p>}
                {selectedBuildVersion && (
                  <p className="text-sm mt-2">Selected: v{selectedBuildVersion.versionNumber}</p>
                )}
                {playingBuildVersion && (
                  <p className="text-sm mt-1">Version: v{playingBuildVersion.versionNumber}</p>
                )}
                {buildVersionsError && (
                  <p className="text-sm mt-2 text-red-400">{buildVersionsError}</p>
                )}
                {launchError && <p className="text-sm mt-2 text-red-400">{launchError}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
