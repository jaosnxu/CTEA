/**
 * Layout Router Tests
 * Tests for SDUI layout configuration API
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "../router";
import {
  DEFAULT_HOME_LAYOUT,
  DEFAULT_ORDER_LAYOUT,
  DEFAULT_MALL_LAYOUT,
} from "@shared/types/layout";

describe("Layout Router", () => {
  // Mock context for testing
  const mockContext = {
    user: {
      id: 1,
      openId: "test-admin",
      name: "Test Admin",
      role: "admin" as const,
    },
    req: {} as any,
    res: {} as any,
  };

  describe("list", () => {
    it("should return empty layout list initially", async () => {
      const caller = appRouter.createCaller(mockContext);
      const result = await caller.layout.list();

      expect(result).toHaveProperty("layouts");
      expect(Array.isArray(result.layouts)).toBe(true);
    });
  });

  describe("get", () => {
    it("should return default home layout when no config exists", async () => {
      const caller = appRouter.createCaller(mockContext);
      const result = await caller.layout.get({ page: "home" });

      expect(result).toHaveProperty("layout");
      expect(result.layout.page).toBe("home");
      expect(result.layout.config).toMatchObject({
        page: "home",
        blocks: expect.any(Array),
      });
    });

    it("should return default order layout", async () => {
      const caller = appRouter.createCaller(mockContext);
      const result = await caller.layout.get({ page: "order" });

      expect(result.layout.page).toBe("order");
      expect(result.layout.config).toMatchObject({
        page: "order",
        blocks: expect.any(Array),
      });
    });

    it("should return default mall layout", async () => {
      const caller = appRouter.createCaller(mockContext);
      const result = await caller.layout.get({ page: "mall" });

      expect(result.layout.page).toBe("mall");
      expect(result.layout.config).toMatchObject({
        page: "mall",
        blocks: expect.any(Array),
      });
    });
  });

  describe("save", () => {
    it("should save a new layout configuration", async () => {
      const caller = appRouter.createCaller(mockContext);

      const customLayout = {
        ...DEFAULT_HOME_LAYOUT,
        blocks: [
          ...DEFAULT_HOME_LAYOUT.blocks,
          {
            id: "test-spacer-1",
            type: "spacer" as const,
            props: { height: 30 },
            visible: true,
            order: 99,
          },
        ],
      };

      const result = await caller.layout.save({
        page: "home",
        config: customLayout,
      });

      expect(result).toHaveProperty("layout");
      expect(result).toHaveProperty("message");
      expect(result.layout.page).toBe("home");
      expect(result.layout.version).toBeGreaterThanOrEqual(1);
      expect(result.layout.isActive).toBe(true);
    });
  });

  describe("history", () => {
    it("should return version history for a page", async () => {
      const caller = appRouter.createCaller(mockContext);
      const result = await caller.layout.history({ page: "home", limit: 10 });

      expect(result).toHaveProperty("versions");
      expect(Array.isArray(result.versions)).toBe(true);
    });
  });
});

describe("Layout Types", () => {
  it("should have valid default home layout", () => {
    expect(DEFAULT_HOME_LAYOUT.page).toBe("home");
    expect(DEFAULT_HOME_LAYOUT.blocks).toBeInstanceOf(Array);
    expect(DEFAULT_HOME_LAYOUT.blocks.length).toBeGreaterThan(0);
  });

  it("should have valid default order layout", () => {
    expect(DEFAULT_ORDER_LAYOUT.page).toBe("order");
    expect(DEFAULT_ORDER_LAYOUT.blocks).toBeInstanceOf(Array);
    expect(DEFAULT_ORDER_LAYOUT.blocks.length).toBeGreaterThan(0);
  });

  it("should have valid default mall layout", () => {
    expect(DEFAULT_MALL_LAYOUT.page).toBe("mall");
    expect(DEFAULT_MALL_LAYOUT.blocks).toBeInstanceOf(Array);
    expect(DEFAULT_MALL_LAYOUT.blocks.length).toBeGreaterThan(0);
  });

  it("should have i18n text in all default layouts", () => {
    const checkI18n = (layout: any) => {
      layout.blocks.forEach((block: any) => {
        if (block.props.title) {
          expect(block.props.title).toHaveProperty("ru");
        }
        if (block.props.content) {
          expect(block.props.content).toHaveProperty("ru");
        }
      });
    };

    checkI18n(DEFAULT_HOME_LAYOUT);
    checkI18n(DEFAULT_ORDER_LAYOUT);
    checkI18n(DEFAULT_MALL_LAYOUT);
  });
});
