import Konva from 'konva';
import { BaseMouseAction } from '../base/BaseMouseAction';
import { ToolContext } from '../../interfaces/IMouseAction';
import { ToolType } from '../../../types/ToolType';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { BaseElement } from '../../../types/BaseElement';
import { getSelectedIds } from '../../utils/selectionUtils';

export class MouseAction extends BaseMouseAction {
  type: ToolType = 'select';
  
  private isDraggingSelection = false;
  private lastDragPos: { x: number; y: number } | null = null;
  private hasMovedDuringDrag = false;
  private shouldClearSelectionOnBoxSelect = false;
  private selectionMouseButton: 0 | 2 | null = null;

  onMouseDown(e: Konva.KonvaEventObject<MouseEvent>, context: ToolContext): void {
    const { selectedId, selectedIds, elements, updateElement, selectElement, selectElements, clearSelection, setIsSelecting, setSelectionBox, setIsDraggingSelection, setDragStartPos, updateSelectionBoundingBox, selectionBoundingBox, setShouldSuppressContextMenu, setDragInitialPositions } = useWorkspaceStore.getState();

    this.hasMovedDuringDrag = false;
    setShouldSuppressContextMenu(false);
    this.shouldClearSelectionOnBoxSelect = false;
    this.selectionMouseButton = null;
    const stage = e.target.getStage();
    if (!stage) return;
    const pointerPos = stage.getPointerPosition();
    if (!pointerPos) return;
    const scale = stage.scaleX();
    const stagePos = stage.position();
    const pos = {
      x: (pointerPos.x - stagePos.x) / scale,
      y: (pointerPos.y - stagePos.y) / scale
    };

    const allSelectedIds = getSelectedIds(selectedId, selectedIds);

    // 检查是否在多选包围盒内（针对右键拖拽或点击空白区域拖拽）
    const isInBoundingBox = selectionBoundingBox &&
      pos.x >= selectionBoundingBox.x &&
      pos.x <= selectionBoundingBox.x + selectionBoundingBox.width &&
      pos.y >= selectionBoundingBox.y &&
      pos.y <= selectionBoundingBox.y + selectionBoundingBox.height;

    let clickedGroupId: string | null = null;
    {
      let current: Konva.Node | null = e.target;
      while (current && current !== current.getStage()) {
        if (current.id() && elements.some(el => el.id === current!.id())) {
          clickedGroupId = current.id();
          break;
        }
        current = current.parent;
      }
    }

    if (e.evt.button === 2) {
      if (clickedGroupId) {
        if (!allSelectedIds.includes(clickedGroupId)) {
          selectElement(clickedGroupId);
          updateSelectionBoundingBox();
        }
        return;
      }
      return;
    }

    if (e.evt.button !== 0) {
      return;
    }

    if (selectedId) {
      const selectedElement = elements.find(el => el.id === selectedId);
      if (selectedElement && selectedElement.isEditing) {
        updateElement(selectedId, { isEditing: false });
      }
    }

    if (!clickedGroupId) {
      if (isInBoundingBox && allSelectedIds.length > 1) {
        this.isDraggingSelection = true;
        this.lastDragPos = { x: pointerPos.x, y: pointerPos.y };
        setIsDraggingSelection(true);
        setDragStartPos({ x: pointerPos.x, y: pointerPos.y });
        const initialPositions = new Map<string, { x: number; y: number }>();
        elements.filter(el => allSelectedIds.includes(el.id)).forEach(el => {
          initialPositions.set(el.id, { x: el.x, y: el.y });
        });
        setDragInitialPositions(initialPositions);
        return;
      }

      this.selectionMouseButton = 0;
      this.startPos = pos;
      this.shouldClearSelectionOnBoxSelect = !e.evt.shiftKey;
      setIsSelecting(true);
      setSelectionBox({ x: pos.x, y: pos.y, width: 0, height: 0 });
      return;
    }

    // 如果点击的是已选中的元素，准备拖动
    if (allSelectedIds.includes(clickedGroupId)) {
      // 只有多选时，才通过 MouseAction 接管拖动，单选通过 ElementWrapper 的 native draggable 处理
      if (allSelectedIds.length > 1) {
        this.isDraggingSelection = true;
        this.lastDragPos = { x: pointerPos.x, y: pointerPos.y };
        setIsDraggingSelection(true);
        setDragStartPos({ x: pointerPos.x, y: pointerPos.y });
        updateSelectionBoundingBox();
        const initialPositions = new Map<string, { x: number; y: number }>();
        elements.filter(el => allSelectedIds.includes(el.id)).forEach(el => {
          initialPositions.set(el.id, { x: el.x, y: el.y });
        });
        setDragInitialPositions(initialPositions);
      }
      return;
    }

    if (!e.evt.shiftKey) {
      selectElement(clickedGroupId);
    } else {
      selectElements([...allSelectedIds, clickedGroupId]);
    }
    updateSelectionBoundingBox();
  }

  onMouseMove(e: Konva.KonvaEventObject<MouseEvent>, context: ToolContext): void {
    const { isSelecting, setSelectionBox, isDraggingSelection, dragSelectedElements, clearSelection } = useWorkspaceStore.getState();
    
    if (isSelecting) {
      const stage = e.target.getStage();
      if (!stage) return;
      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;
      const scale = stage.scaleX();
      const stagePos = stage.position();
      const currentPos = {
        x: (pointerPos.x - stagePos.x) / scale,
        y: (pointerPos.y - stagePos.y) / scale
      };
      
      // 计算选择框
      const x = Math.min(this.startPos.x, currentPos.x);
      const y = Math.min(this.startPos.y, currentPos.y);
      const width = Math.abs(currentPos.x - this.startPos.x);
      const height = Math.abs(currentPos.y - this.startPos.y);
      
      if (!this.hasMovedDuringDrag && (width > 1 || height > 1)) {
        this.hasMovedDuringDrag = true;
        if (this.shouldClearSelectionOnBoxSelect) {
          clearSelection();
          this.shouldClearSelectionOnBoxSelect = false;
        }
      }

      setSelectionBox({ x, y, width, height });
    } else if (this.isDraggingSelection && dragSelectedElements) {
      const { dragStartPos } = useWorkspaceStore.getState();
      // 拖动选中的多个元素
      const stage = e.target.getStage();
      if (!stage) return;
      const currentPos = stage.getPointerPosition();
      if (!currentPos) return;
      
      if (this.lastDragPos && dragStartPos) {
        const dx = currentPos.x - this.lastDragPos.x;
        const dy = currentPos.y - this.lastDragPos.y;
        
        // 如果移动距离超过一个阈值，才认为是拖动
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          this.hasMovedDuringDrag = true;
          
          const scale = stage.scaleX();
          // 计算相对于初始位置的总偏移量，以避免累加误差
          const totalDeltaX = (currentPos.x - dragStartPos.x) / scale;
          const totalDeltaY = (currentPos.y - dragStartPos.y) / scale;
          
          dragSelectedElements(totalDeltaX, totalDeltaY);
          
          this.lastDragPos = { x: currentPos.x, y: currentPos.y };
        }
      }
    }
  }

  onMouseUp(e: Konva.KonvaEventObject<MouseEvent>, context: ToolContext): void {
    const { isSelecting, selectionBox, elements, selectedId, selectedIds, selectElements, clearSelection, setIsSelecting, setSelectionBox, setIsDraggingSelection, updateSelectionBoundingBox, setDragInitialPositions } = useWorkspaceStore.getState();

    if (isSelecting && selectionBox) {
      if (this.hasMovedDuringDrag) {
        const selectedInBox: string[] = [];

        elements.forEach(el => {
          if (this.isElementInBox(el, selectionBox)) {
            selectedInBox.push(el.id);
          }
        });

        if (selectedInBox.length > 0) {
          const currentSelected = getSelectedIds(selectedId, selectedIds);
          const next = e.evt.shiftKey ? [...currentSelected, ...selectedInBox] : selectedInBox;
          selectElements(next);
          updateSelectionBoundingBox();
        }
      } else if (this.shouldClearSelectionOnBoxSelect) {
        clearSelection();
      }

      // 结束框选
      setIsSelecting(false);
      setSelectionBox(null);
      this.selectionMouseButton = null;
    }

    // 结束拖动
    if (this.isDraggingSelection) {
      this.isDraggingSelection = false;
      this.lastDragPos = null;
      setIsDraggingSelection(false);
      setDragInitialPositions(null);
      updateSelectionBoundingBox();
    }
  }
  
  onMouseLeave(e: Konva.KonvaEventObject<MouseEvent>, context: ToolContext): void {
    const { isSelecting, setIsSelecting, setSelectionBox, setDragInitialPositions } = useWorkspaceStore.getState();
    if (isSelecting) {
      setIsSelecting(false);
      setSelectionBox(null);
    }
    // 如果正在拖动时离开画布，也清除初始位置
    if (this.isDraggingSelection) {
      this.isDraggingSelection = false;
      this.lastDragPos = null;
      setIsSelecting(false);
      setDragInitialPositions(null);
    }
  }
  
  /**
   * 判断元素是否在选择框内
   */
  private isElementInBox(el: BaseElement<any>, box: { x: number; y: number; width: number; height: number }): boolean {
    const elLeft = el.x;
    const elRight = el.x + el.width;
    const elTop = el.y;
    const elBottom = el.y + el.height;
    
    return (
      elLeft < box.x + box.width &&
      elRight > box.x &&
      elTop < box.y + box.height &&
      elBottom > box.y
    );
  }
}
