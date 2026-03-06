import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useI18n } from "@/i18n/client";

interface CornerPanelProps {
  cornerRadius: number;
  sides?: number;
  starInnerRadius?: number;
  onUpdate: (updates: any) => void;
  onClose: () => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const CornerPanel = ({
  cornerRadius,
  sides,
  starInnerRadius,
  onUpdate,
  onClose,
}: CornerPanelProps) => {
  const { t } = useI18n();
  const [value, setValue] = useState(cornerRadius);
  const [sidesValue, setSidesValue] = useState(sides || 3);
  const [innerRadiusValue, setInnerRadiusValue] = useState(starInnerRadius !== undefined ? starInnerRadius : 50);

  useEffect(() => {
    setValue(cornerRadius);
  }, [cornerRadius]);

  useEffect(() => {
    if (sides !== undefined) {
      setSidesValue(sides);
    }
  }, [sides]);

  useEffect(() => {
    if (starInnerRadius !== undefined) {
      setInnerRadiusValue(starInnerRadius);
    }
  }, [starInnerRadius]);

  const handleCornerRadiusChange = (next: number) => {
    const normalized = clamp(next, 0, 200);
    setValue(normalized);
    onUpdate({ cornerRadius: normalized });
  };

  const handleSidesChange = (next: number) => {
    const normalized = clamp(next, 3, 60);
    setSidesValue(normalized);
    onUpdate({ sides: normalized });
  };

  const handleInnerRadiusChange = (next: number) => {
    const normalized = clamp(next, 0, 100);
    setInnerRadiusValue(normalized);
    onUpdate({ starInnerRadius: normalized });
  };

  return (
    <div
      className="absolute top-full left-0 mt-2 w-[300px] rounded-xl border border-gray-100 bg-white p-4 shadow-xl z-50"
      onMouseDown={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="font-medium text-gray-700">{t("editor.properties")}</span>
        <button onClick={onClose} className="text-gray-400 transition-colors hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{t("editor.corner_radius")}</span>
            <span>{value}</span>
          </div>
          <div className="flex items-center gap-3">
            <Slider
              min={0}
              max={200}
              step={1}
              value={[value]}
              onValueChange={([next]) => handleCornerRadiusChange(next ?? 0)}
              className="flex-1"
            />
            <Input
              type="number"
              min={0}
              max={200}
              value={value}
              onChange={(event) => handleCornerRadiusChange(parseInt(event.target.value, 10) || 0)}
              className="h-8 w-16 px-2 text-center"
            />
          </div>
        </div>

        {sides !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{t("editor.sides")}</span>
              <span>{sidesValue}</span>
            </div>
            <div className="flex items-center gap-3">
              <Slider
                min={3}
                max={60}
                step={1}
                value={[sidesValue]}
                onValueChange={([next]) => handleSidesChange(next ?? 3)}
                className="flex-1"
              />
              <Input
                type="number"
                min={3}
                max={60}
                value={sidesValue}
                onChange={(event) => handleSidesChange(parseInt(event.target.value, 10) || 3)}
                className="h-8 w-16 px-2 text-center"
              />
            </div>
          </div>
        )}

        {starInnerRadius !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{t("editor.inner_radius")}</span>
              <span>{innerRadiusValue}%</span>
            </div>
            <div className="flex items-center gap-3">
              <Slider
                min={0}
                max={100}
                step={1}
                value={[innerRadiusValue]}
                onValueChange={([next]) => handleInnerRadiusChange(next ?? 0)}
                className="flex-1"
              />
              <Input
                type="number"
                min={0}
                max={100}
                value={innerRadiusValue}
                onChange={(event) => handleInnerRadiusChange(parseInt(event.target.value, 10) || 0)}
                className="h-8 w-16 px-2 text-center"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
