# Design Philosophy: "Zen Tech" (禅意科技)

## Design Movement

**Neo-Minimalism / Soft Modernism**
Inspired by Apple's Human Interface Guidelines and HEYTEA's "Zen" aesthetic. It blends the clean, functional lines of modern tech with the organic, approachable feel of tea culture.

## Core Principles

1.  **Breathability**: Generous whitespace is not empty; it's active. It allows the content (the tea) to be the hero.
2.  **Tactility**: UI elements should feel like physical objects. Glassmorphism (blur) adds depth, and rounded corners (20px) invite touch.
3.  **Clarity**: Information hierarchy is absolute. Primary actions are bold; secondary info recedes. No visual clutter.
4.  **Fluidity**: Transitions are smooth, mimicking the flow of liquid.

## Color Philosophy

- **Base**: `#F8F8F8` (Off-White/Paper) - A warm, organic background that feels like high-quality paper, avoiding the harshness of pure white `#FFFFFF`.
- **Primary Text**: `#222222` (Charcoal) - Soft black for readability without high contrast strain.
- **Secondary Text**: `#A8A8A8` (Stone Gray) - For supporting details, subtle but legible.
- **Accent**: `#000000` (Ink) & `#E63F3F` (Seal Red) - Used sparingly for primary actions (buttons) and alerts/price, resembling traditional calligraphy stamps.

## Layout Paradigm

- **Bottom-Anchored Navigation**: Recognizing mobile-first usage, key navigation is fixed at the bottom.
- **Split-View Ordering**: The classic "Meituan" layout (Left Sidebar + Right Content) is elevated with better spacing and card styling.
- **Floating Elements**: Modals and the settlement bar float above the content, creating a sense of layering and context preservation.

## Signature Elements

1.  **The "Capsule"**: The settlement bar is a floating capsule, not a full-width bar, emphasizing its "object" nature.
2.  **Glass Cards**: Product details appear on a blurred background, maintaining context of the menu behind.
3.  **Soft Shadows**: `shadow-lg` but with reduced opacity, creating lift without heavy borders.

## Interaction Philosophy

- **Instant Feedback**: Every tap has a micro-state change.
- **Non-Blocking**: Adding to cart is a fluid motion that doesn't block browsing.
- **Contextual Reveal**: Details are revealed in layers (modals) rather than page navigations where possible.

## Animation

- **Spring Physics**: Modals enter with a slight bounce/damping, feeling natural.
- **Fade & Scale**: Content transitions use subtle scaling (95% -> 100%) and fading.

## Typography System

- **Headings**: `SF Pro Display` (or system sans), Heavy weight for prices and product names.
- **Body**: `SF Pro Text` (or system sans), Regular weight for descriptions.
- **Numbers**: Monospaced or tabular nums for prices to ensure alignment.
