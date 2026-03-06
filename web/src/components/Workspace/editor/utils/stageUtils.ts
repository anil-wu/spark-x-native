import Konva from 'konva';

export const getStagePos = (stage: Konva.Stage, pointerPosition: { x: number, y: number }) => {
  return {
    x: (pointerPosition.x - stage.x()) / stage.scaleX(),
    y: (pointerPosition.y - stage.y()) / stage.scaleY(),
  };
};
