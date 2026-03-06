export interface Guideline {
  id: string;
  type: 'horizontal' | 'vertical';
  x: number;
  y: number;
  // Start and end points for the line segment
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
