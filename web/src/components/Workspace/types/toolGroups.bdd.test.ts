import { describe, expect, it } from "bun:test";

import {
  isDrawTool,
  isGenericShapeMouseActionTool,
  isSelectTool,
  isShapeTool,
  isTextLikeTool,
  isTextShapeTool,
} from "./toolGroups";
import { given, then, when } from "@/test/bdd";

describe("toolGroups (BDD)", () => {
  it("Given grouped tool predicates, When checking representative tools, Then each category is classified consistently", async () => {
    let checks: Record<string, boolean> = {};

    await given("typical tool types across groups", async () => {
      checks = {
        shapeRectangle: isShapeTool("rectangle"),
        shapeTextCircle: isShapeTool("circle-text"),
        drawPencil: isDrawTool("pencil"),
        drawText: isDrawTool("text"),
        selectHand: isSelectTool("hand"),
        selectImage: isSelectTool("image"),
        textLikeBubble: isTextLikeTool("chat-bubble"),
        textLikePen: isTextLikeTool("pen"),
        textShapeArrow: isTextShapeTool("arrow-right"),
        textShapePlainText: isTextShapeTool("text"),
      };
    });

    await when("tool factory fallback uses the generic shape-action group", async () => {
      checks.genericText = isGenericShapeMouseActionTool("text");
      checks.genericImage = isGenericShapeMouseActionTool("image");
      checks.genericRectangle = isGenericShapeMouseActionTool("rectangle");
    });

    await then("the booleans match the expected group boundaries", async () => {
      expect(checks.shapeRectangle).toBe(true);
      expect(checks.shapeTextCircle).toBe(true);
      expect(checks.drawPencil).toBe(true);
      expect(checks.drawText).toBe(false);
      expect(checks.selectHand).toBe(true);
      expect(checks.selectImage).toBe(false);
      expect(checks.textLikeBubble).toBe(true);
      expect(checks.textLikePen).toBe(false);
      expect(checks.textShapeArrow).toBe(true);
      expect(checks.textShapePlainText).toBe(false);
      expect(checks.genericText).toBe(true);
      expect(checks.genericImage).toBe(true);
      expect(checks.genericRectangle).toBe(false);
    });
  });
});
