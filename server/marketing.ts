/**
 * CHU TEA - Marketing Campaigns System
 * 
 * Features:
 * - Time-limited discounts
 * - Buy One Get One (BOGO)
 * - Bundle deals
 * - Flash sales
 * - Happy hour pricing
 */

export interface Campaign {
  id: string;
  name: string;
  type: 'DISCOUNT' | 'BOGO' | 'BUNDLE' | 'FLASH_SALE' | 'HAPPY_HOUR';
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ENDED';
  startDate: string;
  endDate: string;
  rules: CampaignRules;
  priority: number;  // Higher priority campaigns apply first
  createdAt: string;
  updatedAt: string;
}

export interface CampaignRules {
  // Discount rules
  discountType?: 'PERCENT' | 'FIXED';
  discountValue?: number;
  
  // BOGO rules
  buyQuantity?: number;
  getQuantity?: number;
  bogoProductIds?: number[];
  
  // Bundle rules
  bundleItems?: Array<{ productId: number; quantity: number }>;
  bundlePrice?: number;
  
  // Conditions
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  applicableProducts?: number[];
  applicableCategories?: string[];
  
  // Time restrictions
  daysOfWeek?: number[];  // 0-6 (Sunday-Saturday)
  timeStart?: string;  // HH:MM
  timeEnd?: string;  // HH:MM
  
  // User restrictions
  newUsersOnly?: boolean;
  vipTiersOnly?: string[];
}

// ============================================================================
// Mock Data
// ============================================================================

export const CAMPAIGNS: Campaign[] = [
  {
    id: 'campaign1',
    name: 'Летняя распродажа',
    type: 'DISCOUNT',
    status: 'ACTIVE',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    rules: {
      discountType: 'PERCENT',
      discountValue: 20,
      applicableCategories: ['seasonal'],
    },
    priority: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'campaign2',
    name: 'Happy Hour',
    type: 'HAPPY_HOUR',
    status: 'ACTIVE',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    rules: {
      discountType: 'PERCENT',
      discountValue: 15,
      timeStart: '14:00',
      timeEnd: '17:00',
      daysOfWeek: [1, 2, 3, 4, 5],  // Monday-Friday
    },
    priority: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ============================================================================
// Functions
// ============================================================================

/**
 * Get active campaigns
 */
export function getActiveCampaigns(): Campaign[] {
  const now = new Date();
  
  return CAMPAIGNS.filter(c => {
    if (c.status !== 'ACTIVE') return false;
    
    const start = new Date(c.startDate);
    const end = new Date(c.endDate);
    
    return now >= start && now <= end;
  }).sort((a, b) => b.priority - a.priority);
}

/**
 * Check if campaign applies to product
 */
export function campaignApplies(
  campaign: Campaign,
  productId: number,
  category: string,
  userId?: string,
  userTier?: string
): boolean {
  const rules = campaign.rules;
  
  // Check product restrictions
  if (rules.applicableProducts && !rules.applicableProducts.includes(productId)) {
    return false;
  }
  
  // Check category restrictions
  if (rules.applicableCategories && !rules.applicableCategories.includes(category)) {
    return false;
  }
  
  // Check time restrictions
  if (rules.daysOfWeek || rules.timeStart || rules.timeEnd) {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const timeStr = now.toTimeString().substring(0, 5);  // HH:MM
    
    if (rules.daysOfWeek && !rules.daysOfWeek.includes(dayOfWeek)) {
      return false;
    }
    
    if (rules.timeStart && timeStr < rules.timeStart) {
      return false;
    }
    
    if (rules.timeEnd && timeStr > rules.timeEnd) {
      return false;
    }
  }
  
  // Check VIP restrictions
  if (rules.vipTiersOnly && userTier && !rules.vipTiersOnly.includes(userTier)) {
    return false;
  }
  
  return true;
}

/**
 * Calculate campaign discount
 */
export function calculateCampaignDiscount(
  productId: number,
  category: string,
  price: number,
  quantity: number,
  userId?: string,
  userTier?: string
): { discount: number; campaignName?: string; description?: string } {
  const campaigns = getActiveCampaigns();
  
  for (const campaign of campaigns) {
    if (!campaignApplies(campaign, productId, category, userId, userTier)) {
      continue;
    }
    
    const rules = campaign.rules;
    
    // Discount campaign
    if (campaign.type === 'DISCOUNT' || campaign.type === 'HAPPY_HOUR' || campaign.type === 'FLASH_SALE') {
      if (rules.discountType === 'PERCENT' && rules.discountValue) {
        const discount = (price * quantity * rules.discountValue) / 100;
        const maxDiscount = rules.maxDiscountAmount || Infinity;
        
        return {
          discount: Math.min(discount, maxDiscount),
          campaignName: campaign.name,
          description: `-${rules.discountValue}%`,
        };
      } else if (rules.discountType === 'FIXED' && rules.discountValue) {
        return {
          discount: rules.discountValue * quantity,
          campaignName: campaign.name,
          description: `-₽${rules.discountValue}`,
        };
      }
    }
    
    // BOGO campaign
    if (campaign.type === 'BOGO' && rules.buyQuantity && rules.getQuantity) {
      const sets = Math.floor(quantity / rules.buyQuantity);
      const freeItems = sets * rules.getQuantity;
      const discount = freeItems * price;
      
      return {
        discount,
        campaignName: campaign.name,
        description: `Купи ${rules.buyQuantity}, получи ${rules.getQuantity} бесплатно`,
      };
    }
  }
  
  return { discount: 0 };
}

/**
 * Create campaign
 */
export function createCampaign(campaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>): Campaign {
  const newCampaign: Campaign = {
    ...campaign,
    id: `CAMP${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  CAMPAIGNS.push(newCampaign);
  console.log(`[Marketing] Campaign created: ${newCampaign.name}`);
  
  return newCampaign;
}

/**
 * Update campaign
 */
export function updateCampaign(id: string, updates: Partial<Campaign>): Campaign | null {
  const campaign = CAMPAIGNS.find(c => c.id === id);
  
  if (!campaign) {
    return null;
  }
  
  Object.assign(campaign, updates);
  campaign.updatedAt = new Date().toISOString();
  
  console.log(`[Marketing] Campaign updated: ${campaign.name}`);
  
  return campaign;
}

/**
 * Delete campaign
 */
export function deleteCampaign(id: string): boolean {
  const index = CAMPAIGNS.findIndex(c => c.id === id);
  
  if (index === -1) {
    return false;
  }
  
  CAMPAIGNS.splice(index, 1);
  console.log(`[Marketing] Campaign deleted: ${id}`);
  
  return true;
}
