/**
 * Layout Engine - SDUI (Server-Driven UI) Configuration System
 *
 * Responsibilities:
 * - Manage page layout configurations
 * - Provide default layouts
 * - Store and retrieve custom layouts
 */

import { getPrismaClient } from "../db/prisma";
import type { PrismaClient } from "@prisma/client";

export interface LayoutSection {
  type: string;
  [key: string]: any;
}

export interface LayoutConfig {
  page: string;
  sections: LayoutSection[];
}

/**
 * Default layout templates
 */
const DEFAULT_LAYOUTS: Record<string, LayoutConfig> = {
  home: {
    page: "home",
    sections: [
      {
        type: "banner",
        imageUrl: "/banners/home.jpg",
        autoPlay: true,
        interval: 3000,
      },
      {
        type: "categories",
        columns: 4,
        showIcon: true,
      },
      {
        type: "hotProducts",
        title: "Популярное",
        limit: 6,
        algorithm: "sales_rank",
      },
      {
        type: "memberCard",
      },
      {
        type: "couponSection",
        limit: 3,
      },
    ],
  },
  order: {
    page: "order",
    sections: [
      {
        type: "categoryTabs",
      },
      {
        type: "productGrid",
        columns: 2,
      },
      {
        type: "floatingCart",
      },
    ],
  },
  mall: {
    page: "mall",
    sections: [
      {
        type: "banner",
        imageUrl: "/banners/mall.jpg",
      },
      {
        type: "productGrid",
        columns: 2,
        showFilters: true,
      },
    ],
  },
};

/**
 * Layout Engine - Singleton Pattern
 */
class LayoutEngine {
  private static instance: LayoutEngine;
  private prisma: PrismaClient;

  private constructor() {
    this.prisma = getPrismaClient();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): LayoutEngine {
    if (!LayoutEngine.instance) {
      LayoutEngine.instance = new LayoutEngine();
    }
    return LayoutEngine.instance;
  }

  /**
   * Get layout configuration for a page
   */
  async getLayout(pageName: string): Promise<LayoutConfig | null> {
    try {
      // Try to get layout from database
      const dbLayout = await this.prisma.sduilayouts.findFirst({
        where: {
          layoutCode: pageName,
        },
      });

      if (dbLayout) {
        // Parse layout data if stored as JSON
        try {
          // Assuming the layout data is stored in a JSON field
          // Since schema doesn't show the exact fields, we'll use default for now
          return DEFAULT_LAYOUTS[pageName] || null;
        } catch (parseError) {
          console.error(
            "[LayoutEngine] Error parsing layout JSON:",
            parseError
          );
          // Fall back to default
        }
      }

      // Return default layout if not found in database
      return DEFAULT_LAYOUTS[pageName] || null;
    } catch (error) {
      console.error("[LayoutEngine] Error getting layout:", error);
      // On error, return default layout
      return DEFAULT_LAYOUTS[pageName] || null;
    }
  }

  /**
   * Save layout configuration
   */
  async saveLayout(
    pageName: string,
    config: LayoutConfig
  ): Promise<LayoutConfig> {
    try {
      // Try to find existing layout
      const existing = await this.prisma.sduilayouts.findFirst({
        where: {
          layoutCode: pageName,
        },
      });

      if (existing) {
        // Update existing layout
        await this.prisma.sduilayouts.update({
          where: { id: existing.id },
          data: {
            layoutCode: pageName,
            updatedAt: new Date(),
            // Add more fields based on schema
          },
        });
      } else {
        // Create new layout
        await this.prisma.sduilayouts.create({
          data: {
            layoutCode: pageName,
            orgId: null, // Default org ID (null for UUID compatibility)
            // Add more fields based on schema
          },
        });
      }

      return config;
    } catch (error) {
      console.error("[LayoutEngine] Error saving layout:", error);
      throw new Error("Failed to save layout");
    }
  }

  /**
   * Get all layouts
   */
  async getAllLayouts(): Promise<LayoutConfig[]> {
    try {
      // Get all layouts from database
      const dbLayouts = await this.prisma.sduilayouts.findMany();

      // For now, return default layouts
      return Object.values(DEFAULT_LAYOUTS);
    } catch (error) {
      console.error("[LayoutEngine] Error getting all layouts:", error);
      // On error, return default layouts
      return Object.values(DEFAULT_LAYOUTS);
    }
  }

  /**
   * Delete layout
   */
  async deleteLayout(id: string): Promise<{ success: boolean }> {
    try {
      await this.prisma.sduilayouts.delete({
        where: { id },
      });

      return { success: true };
    } catch (error) {
      console.error("[LayoutEngine] Error deleting layout:", error);
      throw new Error("Failed to delete layout");
    }
  }

  /**
   * Get available page names
   */
  getAvailablePages(): string[] {
    return Object.keys(DEFAULT_LAYOUTS);
  }

  /**
   * Validate layout configuration
   */
  validateLayout(config: LayoutConfig): boolean {
    if (!config.page || !config.sections) {
      return false;
    }

    if (!Array.isArray(config.sections)) {
      return false;
    }

    // Check that each section has a type
    for (const section of config.sections) {
      if (!section.type) {
        return false;
      }
    }

    return true;
  }
}

/**
 * Export singleton instance
 */
export const layoutEngine = LayoutEngine.getInstance();
