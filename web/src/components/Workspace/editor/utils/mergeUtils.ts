"use client";

import Konva from 'konva';
import { BaseElement, ImageElement, ShapeElement, TextElement, DrawElement, TextShapeElement } from '../../types/BaseElement';

export interface MergeResult {
  mergedElement: ImageElement;
  thumbnailSrc: string;
  canvasBlob: Blob | null;
  originalElementsCount: number;
}

/**
 * 合并多个元素为一张图片
 * @param elements 所有元素列表
 * @param selectedIds 选中的元素 ID 列表
 * @param stage 可选的 Konva Stage 实例，如果提供，将直接从 Stage 中克隆节点以保证效果一致
 * @returns 合并结果
 */
export async function mergeElements(
  elements: BaseElement<any>[],
  selectedIds: string[],
  stage?: Konva.Stage
): Promise<MergeResult | null> {
  const selectedElements = elements.filter(el => selectedIds.includes(el.id));
  
  if (selectedElements.length < 2) {
    return null;
  }
  
  // 1. 获取所有选中的节点并计算精确的包围盒
  let nodes: Konva.Node[] = [];
  let boundingBox: { x: number; y: number; width: number; height: number };

  if (stage) {
    // 如果提供了 stage，直接获取现有节点并计算精确包围盒
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    for (const id of selectedIds) {
      const node = stage.findOne('#' + id);
      if (node) {
        const cloned = node.clone();
        nodes.push(cloned);
        
        // 使用 getClientRect 获取包含描边、旋转等在内的精确包围盒
        const rect = node.getClientRect();
        minX = Math.min(minX, rect.x);
        minY = Math.min(minY, rect.y);
        maxX = Math.max(maxX, rect.x + rect.width);
        maxY = Math.max(maxY, rect.y + rect.height);
      }
    }
    
    boundingBox = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };

    // 调整克隆节点的坐标为相对于新包围盒的坐标
    nodes.forEach(node => {
      node.x(node.x() - boundingBox.x);
      node.y(node.y() - boundingBox.y);
    });
  } else {
    // 如果没有提供 stage，使用基础包围盒计算和节点创建逻辑
    boundingBox = calculateBoundingBox(selectedElements);
    const nodePromises = selectedElements.map(el => createKonvaNode(el, boundingBox));
    const createdNodes = await Promise.all(nodePromises);
    nodes = createdNodes.filter((n): n is Konva.Node => n !== null);
  }
  
  if (nodes.length === 0) {
    return null;
  }
  
  // 2. 创建临时 Konva stage
  const container = document.createElement('div');
  const tempStage = new Konva.Stage({
    container: container,
    width: boundingBox.width,
    height: boundingBox.height,
  });
  
  const layer = new Konva.Layer();
  tempStage.add(layer);
  
  nodes.forEach(node => {
    layer.add(node as any);
  });
  
  // 4. 渲染
  layer.draw();
  
  // 5. 获取 DataURL（用于预览和临时显示）
  const scale = 2;
  const dataURL = tempStage.toDataURL({ pixelRatio: scale });
  
  // 6. 转换为 Blob（用于上传）
  const canvasBlob = await new Promise<Blob | null>((resolve) => {
    const canvas = tempStage.toCanvas({ pixelRatio: scale });
    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/png', 1.0);
  });
  
  // 7. 销毁临时 stage
  tempStage.destroy();
  
  // 8. 创建合并后的图片元素
  const mergedElement = new ImageElement({
    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
    type: 'image',
    name: `Merged (${selectedElements.length} layers)`,
    x: boundingBox.x,
    y: boundingBox.y,
    width: boundingBox.width,
    height: boundingBox.height,
    rotation: 0,
    visible: true,
    locked: false,
    isEditing: false,
    src: dataURL,  // 临时使用 base64，上传后会更新为后端 URL
  });
  
  return {
    mergedElement,
    thumbnailSrc: dataURL,
    canvasBlob,
    originalElementsCount: selectedElements.length,
  };
}

/**
 * 计算多个元素的包围盒
 */
export function calculateBoundingBox(elements: BaseElement<any>[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  elements.forEach(el => {
    minX = Math.min(minX, el.x);
    minY = Math.min(minY, el.y);
    maxX = Math.max(maxX, el.x + el.width);
    maxY = Math.max(maxY, el.y + el.height);
  });
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * 获取虚线样式
 */
function getDash(strokeStyle?: string) {
  switch (strokeStyle) {
    case 'dashed': return [10, 5];
    case 'dotted': return [2, 2];
    default: return undefined;
  }
}

/**
 * 根据元素类型创建对应的 Konva 节点
 */
async function createKonvaNode(el: BaseElement<any>, boundingBox: { x: number; y: number }): Promise<Konva.Node | null> {
  // 计算相对坐标
  const x = el.x - boundingBox.x;
  const y = el.y - boundingBox.y;
  
  switch (el.type) {
    case 'rectangle': {
      const shapeEl = el as ShapeElement;
      return new Konva.Rect({
        x,
        y,
        width: el.width,
        height: el.height,
        fill: shapeEl.color,
        stroke: shapeEl.stroke,
        strokeWidth: shapeEl.strokeWidth,
        dash: getDash(shapeEl.strokeStyle),
        cornerRadius: shapeEl.cornerRadius,
        rotation: el.rotation,
      });
    }
    
    case 'circle': {
      const shapeEl = el as ShapeElement;
      return new Konva.Ellipse({
        x: x + el.width / 2,
        y: y + el.height / 2,
        radiusX: el.width / 2,
        radiusY: el.height / 2,
        fill: shapeEl.color,
        stroke: shapeEl.stroke,
        strokeWidth: shapeEl.strokeWidth,
        dash: getDash(shapeEl.strokeStyle),
        rotation: el.rotation,
      });
    }
    
    case 'triangle': {
      const shapeEl = el as ShapeElement;
      // 使用 Shape 绘制三角形
      const triangle = new Konva.Shape({
        x: x + el.width / 2,
        y: y + el.height / 2,
        fill: shapeEl.color,
        stroke: shapeEl.stroke,
        strokeWidth: shapeEl.strokeWidth,
        dash: getDash(shapeEl.strokeStyle),
        rotation: el.rotation,
        sceneFunc: (context, shape) => {
          context.beginPath();
          context.moveTo(0, -el.height / 2);
          context.lineTo(el.width / 2, el.height / 2);
          context.lineTo(-el.width / 2, el.height / 2);
          context.closePath();
          context.fillStrokeShape(shape);
        },
      });
      return triangle;
    }
    
    case 'star': {
      const shapeEl = el as ShapeElement;
      const sides = shapeEl.sides || 5;
      const outerRadius = Math.max(el.width, el.height) / 2;
      const innerRadius = shapeEl.starInnerRadius || outerRadius * 0.5;
      
      const star = new Konva.Star({
        x: x + el.width / 2,
        y: y + el.height / 2,
        numPoints: sides,
        innerRadius,
        outerRadius,
        fill: shapeEl.color,
        stroke: shapeEl.stroke,
        strokeWidth: shapeEl.strokeWidth,
        dash: getDash(shapeEl.strokeStyle),
        rotation: el.rotation,
      });
      return star;
    }
    
    case 'text': {
      const textEl = el as TextElement;
      return new Konva.Text({
        x,
        y,
        width: el.width,
        height: el.height,
        text: textEl.text,
        fontSize: textEl.fontSize,
        fontFamily: textEl.fontFamily,
        fill: textEl.textColor,
        stroke: textEl.textStroke,
        strokeWidth: textEl.textStrokeWidth,
        fontStyle: textEl.fontStyle,
        align: textEl.align,
        lineHeight: textEl.lineHeight,
        letterSpacing: textEl.letterSpacing,
        textDecoration: textEl.textDecoration,
        rotation: el.rotation,
      });
    }
    
    case 'image': {
      const imageEl = el as ImageElement;
      
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.crossOrigin = 'anonymous'; // 避免画布污染
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = imageEl.src;
      });
      
      return new Konva.Image({
        x,
        y,
        width: el.width,
        height: el.height,
        image: img,
        rotation: el.rotation,
      });
    }
    
    case 'pen':
    case 'pencil': {
      const drawEl = el as DrawElement;
      const points = drawEl.points;
      
      if (!points || points.length < 2) {
        return null;
      }
      
      // 转换为相对坐标
      const relativePoints: number[] = [];
      for (let i = 0; i < points.length; i += 2) {
        relativePoints.push(points[i] - boundingBox.x);
        relativePoints.push(points[i + 1] - boundingBox.y);
      }
      
      const line = new Konva.Line({
        points: relativePoints,
        stroke: drawEl.stroke,
        strokeWidth: drawEl.strokeWidth,
        fill: drawEl.fill,
        lineCap: 'round',
        lineJoin: 'round',
        tension: el.type === 'pencil' ? 0.5 : 0, // pencil has tension, pen usually doesn't or it's straight lines
        rotation: el.rotation,
      });
      
      return line;
    }
    
    case 'chat-bubble':
    case 'arrow-left':
    case 'arrow-right':
    case 'rectangle-text':
    case 'circle-text': {
      const textShapeEl = el as TextShapeElement;
      
      // 创建容器组
      const group = new Konva.Group({
        x: x,
        y: y,
        width: el.width,
        height: el.height,
        rotation: el.rotation,
      });
      
      // 背景形状
      let bg: Konva.Shape;
      const dash = getDash(textShapeEl.strokeStyle);

      if (el.type === 'chat-bubble') {
        const r = textShapeEl.cornerRadius || 20;
        const w = el.width;
        const h = el.height;
        const tailHeight = 15;
        const topOffset = tailHeight;
        const bh = h - tailHeight - topOffset;
        const safeR = Math.min(r, w / 2, bh / 2);
        
        // Tail parameters
        const t1 = 45; 
        const t2 = 15; 
        const t3 = 25; 

        bg = new Konva.Path({
          data: `
            M ${safeR} ${topOffset}
            L ${w - safeR} ${topOffset}
            Q ${w} ${topOffset} ${w} ${safeR + topOffset}
            L ${w} ${bh + topOffset - safeR}
            Q ${w} ${bh + topOffset} ${w - safeR} ${bh + topOffset}
            L ${t1} ${bh + topOffset}
            L ${t2} ${h}
            L ${t3} ${bh + topOffset}
            L ${safeR} ${bh + topOffset}
            Q 0 ${bh + topOffset} 0 ${bh + topOffset - safeR}
            L 0 ${safeR + topOffset}
            Q 0 ${topOffset} ${safeR} ${topOffset}
            Z
          `,
          fill: textShapeEl.color,
          stroke: textShapeEl.stroke,
          strokeWidth: textShapeEl.strokeWidth,
          dash: dash,
          lineJoin: 'round',
          lineCap: 'round',
        });
      } else if (el.type === 'arrow-left' || el.type === 'arrow-right') {
        const headLength = el.width * 0.4;
        const tailLength = el.width - headLength;
        const tailThickness = el.height * 0.5;
        const headSpan = el.height * 0.9;
        const cY = el.height / 2;
        const tailTop = cY - tailThickness / 2;
        const tailBottom = cY + tailThickness / 2;
        const headTop = cY - headSpan / 2;
        const headBottom = cY + headSpan / 2;

        let pathData = '';
        if (el.type === 'arrow-left') {
          pathData = `
            M ${el.width} ${tailTop}
            L ${headLength} ${tailTop}
            L ${headLength} ${headTop}
            L 0 ${cY}
            L ${headLength} ${headBottom}
            L ${headLength} ${tailBottom}
            L ${el.width} ${tailBottom}
            Z
          `;
        } else {
          pathData = `
            M 0 ${tailTop}
            L ${tailLength} ${tailTop}
            L ${tailLength} ${headTop}
            L ${el.width} ${cY}
            L ${tailLength} ${headBottom}
            L ${tailLength} ${tailBottom}
            L 0 ${tailBottom}
            Z
          `;
        }

        bg = new Konva.Path({
          data: pathData,
          fill: textShapeEl.color,
          stroke: textShapeEl.stroke || textShapeEl.color,
          strokeWidth: textShapeEl.strokeWidth !== undefined ? textShapeEl.strokeWidth : 8,
          dash: dash,
          lineJoin: 'round',
          lineCap: 'round',
        });
      } else if (el.type === 'circle-text') {
        bg = new Konva.Ellipse({
          x: el.width / 2,
          y: el.height / 2,
          radiusX: el.width / 2,
          radiusY: el.height / 2,
          fill: textShapeEl.color,
          stroke: textShapeEl.stroke,
          strokeWidth: textShapeEl.strokeWidth,
          dash: dash,
        });
      } else {
        // rectangle-text
        bg = new Konva.Rect({
          width: el.width,
          height: el.height,
          fill: textShapeEl.color,
          stroke: textShapeEl.stroke,
          strokeWidth: textShapeEl.strokeWidth,
          cornerRadius: textShapeEl.cornerRadius,
          dash: dash,
        });
      }
      
      // 文本
      const text = new Konva.Text({
        width: el.width,
        height: el.height,
        text: textShapeEl.text,
        fontSize: textShapeEl.fontSize,
        fontFamily: textShapeEl.fontFamily,
        fill: textShapeEl.textColor,
        stroke: textShapeEl.textStroke,
        strokeWidth: textShapeEl.textStrokeWidth,
        fontStyle: textShapeEl.fontStyle,
        align: textShapeEl.align,
        verticalAlign: 'middle',
        lineHeight: textShapeEl.lineHeight,
        letterSpacing: textShapeEl.letterSpacing,
        textDecoration: textShapeEl.textDecoration,
      });
      
      group.add(bg);
      group.add(text);
      
      return group;
    }
    
    default:
      console.warn('Unknown element type:', el.type);
      return null;
  }
}
