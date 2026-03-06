import Konva from 'konva';
import { Guideline } from '../../types/Guideline';

export const SNAP_THRESHOLD = 5;

type SnapResult = {
  shiftX: number;
  shiftY: number;
  guidelines: Guideline[];
};

export const getSnapShift = (
  dragRect: { x: number; y: number; width: number; height: number },
  otherNodes: Konva.Node[],
  layer: Konva.Layer
): SnapResult => {
  const dragEdges = {
    left: dragRect.x,
    center: dragRect.x + dragRect.width / 2,
    right: dragRect.x + dragRect.width,
    top: dragRect.y,
    middle: dragRect.y + dragRect.height / 2,
    bottom: dragRect.y + dragRect.height,
  };

  let minDiffX = SNAP_THRESHOLD + 1;
  let shiftX = 0;
  let minDiffY = SNAP_THRESHOLD + 1;
  let shiftY = 0;

  otherNodes.forEach(node => {
    if (!node.isVisible() || node.name() === '_anchor' || !node.id()) return;
    
    const rect = node.getClientRect({ relativeTo: layer });
    const edges = {
      left: rect.x,
      center: rect.x + rect.width / 2,
      right: rect.x + rect.width,
      top: rect.y,
      middle: rect.y + rect.height / 2,
      bottom: rect.y + rect.height,
    };

    // Vertical alignment (X axis)
    const vCheck = [
      { d: dragEdges.left, t: edges.left },
      { d: dragEdges.left, t: edges.center },
      { d: dragEdges.left, t: edges.right },
      { d: dragEdges.center, t: edges.left },
      { d: dragEdges.center, t: edges.center },
      { d: dragEdges.center, t: edges.right },
      { d: dragEdges.right, t: edges.left },
      { d: dragEdges.right, t: edges.center },
      { d: dragEdges.right, t: edges.right },
    ];

    vCheck.forEach(check => {
      const diff = Math.abs(check.d - check.t);
      if (diff < minDiffX) {
        minDiffX = diff;
        shiftX = check.t - check.d;
      }
    });

    // Horizontal alignment (Y axis)
    const hCheck = [
      { d: dragEdges.top, t: edges.top },
      { d: dragEdges.top, t: edges.middle },
      { d: dragEdges.top, t: edges.bottom },
      { d: dragEdges.middle, t: edges.top },
      { d: dragEdges.middle, t: edges.middle },
      { d: dragEdges.middle, t: edges.bottom },
      { d: dragEdges.bottom, t: edges.top },
      { d: dragEdges.bottom, t: edges.middle },
      { d: dragEdges.bottom, t: edges.bottom },
    ];

    hCheck.forEach(check => {
      const diff = Math.abs(check.d - check.t);
      if (diff < minDiffY) {
        minDiffY = diff;
        shiftY = check.t - check.d;
      }
    });
  });
  
  // Now generate guidelines based on the shifted position
  const guidelines: Guideline[] = [];
  const snappedRect = {
    x: dragRect.x + shiftX,
    y: dragRect.y + shiftY,
    width: dragRect.width,
    height: dragRect.height,
  };
  const snappedEdges = {
    left: snappedRect.x,
    center: snappedRect.x + snappedRect.width / 2,
    right: snappedRect.x + snappedRect.width,
    top: snappedRect.y,
    middle: snappedRect.y + snappedRect.height / 2,
    bottom: snappedRect.y + snappedRect.height,
  };
  
  const epsilon = 1;

  otherNodes.forEach(node => {
     if (!node.isVisible() || node.name() === '_anchor' || !node.id()) return;
     const rect = node.getClientRect({ relativeTo: layer });
     const edges = {
      left: rect.x,
      center: rect.x + rect.width / 2,
      right: rect.x + rect.width,
      top: rect.y,
      middle: rect.y + rect.height / 2,
      bottom: rect.y + rect.height,
    };

    if (Math.abs(shiftX) <= SNAP_THRESHOLD + 1) { 
       const xPairs = [
         { d: snappedEdges.left, t: edges.left }, { d: snappedEdges.left, t: edges.center }, { d: snappedEdges.left, t: edges.right },
         { d: snappedEdges.center, t: edges.left }, { d: snappedEdges.center, t: edges.center }, { d: snappedEdges.center, t: edges.right },
         { d: snappedEdges.right, t: edges.left }, { d: snappedEdges.right, t: edges.center }, { d: snappedEdges.right, t: edges.right },
       ];
       xPairs.forEach(pair => {
         if (Math.abs(pair.d - pair.t) < epsilon) {
            guidelines.push({
             id: `v-${node.id()}-${pair.t}-${Date.now()}-${Math.random()}`, 
             type: 'vertical',
             x: pair.t,
             y: 0,
             x1: pair.t,
             y1: Math.min(snappedRect.y, rect.y) - 20,
             x2: pair.t,
             y2: Math.max(snappedRect.y + snappedRect.height, rect.y + rect.height) + 20,
           });
         }
       });
    }

    if (Math.abs(shiftY) <= SNAP_THRESHOLD + 1) {
       const yPairs = [
         { d: snappedEdges.top, t: edges.top }, { d: snappedEdges.top, t: edges.middle }, { d: snappedEdges.top, t: edges.bottom },
         { d: snappedEdges.middle, t: edges.top }, { d: snappedEdges.middle, t: edges.middle }, { d: snappedEdges.middle, t: edges.bottom },
         { d: snappedEdges.bottom, t: edges.top }, { d: snappedEdges.bottom, t: edges.middle }, { d: snappedEdges.bottom, t: edges.bottom },
       ];
       yPairs.forEach(pair => {
         if (Math.abs(pair.d - pair.t) < epsilon) {
           guidelines.push({
             id: `h-${node.id()}-${pair.t}-${Date.now()}-${Math.random()}`,
             type: 'horizontal',
             x: 0,
             y: pair.t,
             x1: Math.min(snappedRect.x, rect.x) - 20,
             y1: pair.t,
             x2: Math.max(snappedRect.x + snappedRect.width, rect.x + rect.width) + 20,
             y2: pair.t,
           });
         }
       });
    }
  });

  return { shiftX, shiftY, guidelines };
};

export const calculateSnap = (
  dragNode: Konva.Node,
  otherNodes: Konva.Node[]
): { x: number | null; y: number | null; guidelines: Guideline[] } => {
  const layer = dragNode.getLayer();
  if (!layer) return { x: null, y: null, guidelines: [] };
  
  const dragRect = dragNode.getClientRect({ relativeTo: layer });
  const { shiftX, shiftY, guidelines } = getSnapShift(dragRect, otherNodes, layer);
  
  return {
    x: Math.abs(shiftX) < SNAP_THRESHOLD + 1 ? dragNode.x() + shiftX : null,
    y: Math.abs(shiftY) < SNAP_THRESHOLD + 1 ? dragNode.y() + shiftY : null,
    guidelines
  };
};
