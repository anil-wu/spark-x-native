import Konva from 'konva';
import { BaseMouseAction } from './BaseMouseAction';
import { ToolContext } from '../../interfaces/IMouseAction';
import { ToolType } from '../../../types/ToolType';
import { ElementFactory, DrawElement } from '../../../types/BaseElement';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';

export abstract class DrawMouseAction extends BaseMouseAction {
  abstract type: ToolType;

  protected finishDrawing(drawEl: DrawElement, context: ToolContext, closePath: boolean = false) {
    const { addElement, selectElement } = useWorkspaceStore.getState();
    const { setIsDrawing, setPreviewElement, onToolUsed, setIsClosingPath } = context;

    let points = drawEl.points || [];
    
    // If closing path, make sure last point matches first
    if (closePath && points.length >= 2) {
        points = [...points.slice(0, points.length - 2), points[0], points[1]];
    } else {
        // If just finishing, remove the last "moving" point (last 2 coords)
        // because it was just tracking the cursor and not clicked yet.
        if (points.length >= 2) {
            points = points.slice(0, points.length - 2);
        }
    }

    if (points.length < 4) {
        setIsDrawing(false);
        setPreviewElement(null);
        return;
    }

    // Normalize points
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    for (let i = 0; i < points.length; i += 2) {
        const px = points[i];
        const py = points[i+1];
        minX = Math.min(minX, px);
        minY = Math.min(minY, py);
        maxX = Math.max(maxX, px);
        maxY = Math.max(maxY, py);
    }
    
    const width = maxX - minX;
    const height = maxY - minY;
    
    const newPoints = points.map((val, i) => {
        return i % 2 === 0 ? val - minX : val - minY;
    });
    
    const finalElement = drawEl.update({
        x: minX,
        y: minY,
        width: Math.max(width, 1),
        height: Math.max(height, 1),
        points: newPoints
    });

    addElement(finalElement);
    selectElement(finalElement.id);
    onToolUsed();
    
    setIsDrawing(false);
    setPreviewElement(null);
    if (setIsClosingPath) setIsClosingPath(false);
  }
}
