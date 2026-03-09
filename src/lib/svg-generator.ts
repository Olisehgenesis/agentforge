/**
 * Random SVG Generator Utility
 * Generates cool NFT-style SVGs for logos, favicons, and other assets
 */

export interface SVGConfig {
  width?: number;
  height?: number;
  viewBox?: string;
  style?: 'geometric' | 'organic' | 'abstract' | 'tech' | 'space' | 'cyber';
  colors?: string[];
  complexity?: 'simple' | 'medium' | 'complex';
  animated?: boolean;
}

export interface GeneratedSVG {
  svg: string;
  config: SVGConfig;
  seed: string;
}

// Default color palettes for different styles
const COLOR_PALETTES = {
  geometric: ['#8b5cf6', '#ec4899', '#84cc16', '#f59e0b', '#ef4444', '#3b82f6'],
  organic: ['#10b981', '#059669', '#047857', '#065f46', '#064e3b', '#fbbf24'],
  abstract: ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444', '#06b6d4'],
  tech: ['#00d4aa', '#00a8cc', '#0066cc', '#004499', '#002266', '#ffffff'],
  space: ['#1e1b4b', '#312e81', '#4c1d95', '#7c3aed', '#a855f7', '#c084fc'],
  cyber: ['#00ff88', '#00cc66', '#009944', '#006622', '#003311', '#000000']
};

// Default configuration
const DEFAULT_CONFIG: SVGConfig = {
  width: 64,
  height: 64,
  viewBox: '0 0 64 64',
  style: 'geometric',
  complexity: 'medium',
  animated: false
};

/**
 * Generate a random seed for reproducible generation
 */
export function generateSeed(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Seeded random number generator
 */
function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  let current = Math.abs(hash);
  return () => {
    current = (current * 9301 + 49297) % 233280;
    return current / 233280;
  };
}

/**
 * Pick random element from array using seeded random
 */
function randomChoice<T>(array: T[], random: () => number): T {
  return array[Math.floor(random() * array.length)];
}

/**
 * Generate random number between min and max using seeded random
 */
function randomBetween(min: number, max: number, random: () => number): number {
  return min + random() * (max - min);
}

/**
 * Generate a cool NFT-style logo SVG
 */
export function generateNFTSVG(config: Partial<SVGConfig> = {}, seed?: string): GeneratedSVG {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const finalSeed = seed || generateSeed();
  const random = seededRandom(finalSeed);
  
  const colors = finalConfig.colors || COLOR_PALETTES[finalConfig.style!];
  
  let svgElements: string[] = [];
  
  switch (finalConfig.style) {
    case 'geometric':
      svgElements = generateGeometricElements(finalConfig, colors, random);
      break;
    case 'organic':
      svgElements = generateOrganicElements(finalConfig, colors, random);
      break;
    case 'abstract':
      svgElements = generateAbstractElements(finalConfig, colors, random);
      break;
    case 'tech':
      svgElements = generateTechElements(finalConfig, colors, random);
      break;
    case 'space':
      svgElements = generateSpaceElements(finalConfig, colors, random);
      break;
    case 'cyber':
      svgElements = generateCyberElements(finalConfig, colors, random);
      break;
    default:
      svgElements = generateGeometricElements(finalConfig, colors, random);
  }
  
  const svg = `<svg width="${finalConfig.width}" height="${finalConfig.height}" viewBox="${finalConfig.viewBox}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${generateGradients(colors, random)}
    ${generateFilters(random)}
  </defs>
  ${svgElements.join('\n  ')}
</svg>`;
  
  return {
    svg,
    config: finalConfig,
    seed: finalSeed
  };
}

/**
 * Generate geometric elements
 */
function generateGeometricElements(config: SVGConfig, colors: string[], random: () => number): string[] {
  const elements: string[] = [];
  const complexity = config.complexity === 'simple' ? 3 : config.complexity === 'medium' ? 6 : 10;
  
  // Background
  elements.push(`<rect width="64" height="64" fill="${randomChoice(colors, random)}" opacity="0.1"/>`);
  
  for (let i = 0; i < complexity; i++) {
    const shape = randomChoice(['circle', 'rect', 'polygon', 'path'], random);
    const color = randomChoice(colors, random);
    const opacity = randomBetween(0.3, 0.9, random);
    
    switch (shape) {
      case 'circle':
        const cx = randomBetween(10, 54, random);
        const cy = randomBetween(10, 54, random);
        const r = randomBetween(5, 20, random);
        elements.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="${opacity}"/>`);
        break;
        
      case 'rect':
        const x = randomBetween(5, 40, random);
        const y = randomBetween(5, 40, random);
        const width = randomBetween(10, 25, random);
        const height = randomBetween(10, 25, random);
        const rotation = randomBetween(0, 45, random);
        elements.push(`<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${color}" opacity="${opacity}" transform="rotate(${rotation} ${x + width/2} ${y + height/2})"/>`);
        break;
        
      case 'polygon':
        const sides = randomBetween(3, 8, random);
        const centerX = randomBetween(15, 49, random);
        const centerY = randomBetween(15, 49, random);
        const radius = randomBetween(8, 18, random);
        const points = generatePolygonPoints(centerX, centerY, radius, sides, random);
        elements.push(`<polygon points="${points}" fill="${color}" opacity="${opacity}"/>`);
        break;
        
      case 'path':
        const pathData = generateRandomPath(random);
        elements.push(`<path d="${pathData}" fill="${color}" opacity="${opacity}"/>`);
        break;
    }
  }
  
  return elements;
}

/**
 * Generate organic elements
 */
function generateOrganicElements(_config: SVGConfig, colors: string[], random: () => number): string[] {
  const elements: string[] = [];
  
  // Organic background
  elements.push(`<rect width="64" height="64" fill="${randomChoice(colors, random)}" opacity="0.1"/>`);
  
  // Blob-like shapes
  for (let i = 0; i < 4; i++) {
    const color = randomChoice(colors, random);
    const pathData = generateBlobPath(random);
    elements.push(`<path d="${pathData}" fill="${color}" opacity="${randomBetween(0.4, 0.8, random)}"/>`);
  }
  
  return elements;
}

/**
 * Generate abstract elements
 */
function generateAbstractElements(_config: SVGConfig, colors: string[], random: () => number): string[] {
  const elements: string[] = [];
  
  // Abstract background
  elements.push(`<rect width="64" height="64" fill="${randomChoice(colors, random)}" opacity="0.1"/>`);
  
  // Flowing curves and shapes
  for (let i = 0; i < 5; i++) {
    const color = randomChoice(colors, random);
    const pathData = generateAbstractPath(random);
    elements.push(`<path d="${pathData}" fill="${color}" opacity="${randomBetween(0.3, 0.7, random)}"/>`);
  }
  
  return elements;
}

/**
 * Generate tech elements
 */
function generateTechElements(_config: SVGConfig, colors: string[], random: () => number): string[] {
  const elements: string[] = [];
  
  // Tech background
  elements.push(`<rect width="64" height="64" fill="${randomChoice(colors, random)}" opacity="0.1"/>`);
  
  // Circuit-like patterns
  for (let i = 0; i < 6; i++) {
    const color = randomChoice(colors, random);
    const pathData = generateCircuitPath(random);
    elements.push(`<path d="${pathData}" fill="none" stroke="${color}" stroke-width="2" opacity="${randomBetween(0.5, 0.9, random)}"/>`);
  }
  
  // Tech nodes
  for (let i = 0; i < 8; i++) {
    const color = randomChoice(colors, random);
    const x = randomBetween(8, 56, random);
    const y = randomBetween(8, 56, random);
    const r = randomBetween(2, 6, random);
    elements.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="${randomBetween(0.6, 1, random)}"/>`);
  }
  
  return elements;
}

/**
 * Generate space elements
 */
function generateSpaceElements(_config: SVGConfig, colors: string[], random: () => number): string[] {
  const elements: string[] = [];
  
  // Space background
  elements.push(`<rect width="64" height="64" fill="${randomChoice(colors, random)}" opacity="0.2"/>`);
  
  // Stars
  for (let i = 0; i < 15; i++) {
    const color = randomChoice(colors, random);
    const x = randomBetween(4, 60, random);
    const y = randomBetween(4, 60, random);
    const size = randomBetween(1, 3, random);
    elements.push(`<circle cx="${x}" cy="${y}" r="${size}" fill="${color}" opacity="${randomBetween(0.6, 1, random)}"/>`);
  }
  
  // Nebula-like shapes
  for (let i = 0; i < 3; i++) {
    const color = randomChoice(colors, random);
    const pathData = generateNebulaPath(random);
    elements.push(`<path d="${pathData}" fill="${color}" opacity="${randomBetween(0.3, 0.6, random)}"/>`);
  }
  
  return elements;
}

/**
 * Generate cyber elements
 */
function generateCyberElements(_config: SVGConfig, colors: string[], random: () => number): string[] {
  const elements: string[] = [];
  
  // Cyber background
  elements.push(`<rect width="64" height="64" fill="${randomChoice(colors, random)}" opacity="0.1"/>`);
  
  // Cyber grid
  for (let i = 0; i < 8; i++) {
    const color = randomChoice(colors, random);
    const pathData = generateCyberGrid(random);
    elements.push(`<path d="${pathData}" fill="none" stroke="${color}" stroke-width="1" opacity="${randomBetween(0.4, 0.8, random)}"/>`);
  }
  
  // Cyber nodes
  for (let i = 0; i < 6; i++) {
    const color = randomChoice(colors, random);
    const x = randomBetween(10, 54, random);
    const y = randomBetween(10, 54, random);
    const size = randomBetween(3, 8, random);
    elements.push(`<rect x="${x - size/2}" y="${y - size/2}" width="${size}" height="${size}" fill="${color}" opacity="${randomBetween(0.7, 1, random)}"/>`);
  }
  
  return elements;
}

/**
 * Generate gradients
 */
function generateGradients(colors: string[], random: () => number): string {
  const gradientId = `gradient-${Math.floor(random() * 1000)}`;
  const color1 = randomChoice(colors, random);
  const color2 = randomChoice(colors, random);
  
  return `<linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
    <stop offset="100%" style="stop-color:${color2};stop-opacity:0.5" />
  </linearGradient>`;
}

/**
 * Generate filters
 */
function generateFilters(random: () => number): string {
  const filterId = `filter-${Math.floor(random() * 1000)}`;
  
  return `<filter id="${filterId}">
    <feGaussianBlur in="SourceGraphic" stdDeviation="1"/>
    <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"/>
  </filter>`;
}

/**
 * Generate polygon points
 */
function generatePolygonPoints(centerX: number, centerY: number, radius: number, sides: number, random: () => number): string {
  const points: string[] = [];
  const angleStep = (2 * Math.PI) / sides;
  
  for (let i = 0; i < sides; i++) {
    const angle = i * angleStep + random() * 0.5; // Add some randomness
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    points.push(`${x},${y}`);
  }
  
  return points.join(' ');
}

/**
 * Generate random path
 */
function generateRandomPath(random: () => number): string {
  const startX = randomBetween(10, 54, random);
  const startY = randomBetween(10, 54, random);
  
  let path = `M ${startX} ${startY}`;
  
  for (let i = 0; i < 4; i++) {
    const x = randomBetween(5, 59, random);
    const y = randomBetween(5, 59, random);
    path += ` L ${x} ${y}`;
  }
  
  path += ' Z';
  return path;
}

/**
 * Generate blob path
 */
function generateBlobPath(random: () => number): string {
  const centerX = randomBetween(15, 49, random);
  const centerY = randomBetween(15, 49, random);
  const radius = randomBetween(8, 20, random);
  
  let path = `M ${centerX + radius} ${centerY}`;
  
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const r = radius + randomBetween(-5, 5, random);
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);
    
    if (i === 0) {
      path += ` Q ${x} ${y}`;
    } else {
      path += ` ${x} ${y}`;
    }
  }
  
  path += ' Z';
  return path;
}

/**
 * Generate abstract path
 */
function generateAbstractPath(random: () => number): string {
  const startX = randomBetween(5, 59, random);
  const startY = randomBetween(5, 59, random);
  
  let path = `M ${startX} ${startY}`;
  
  for (let i = 0; i < 6; i++) {
    const x = randomBetween(5, 59, random);
    const y = randomBetween(5, 59, random);
    const controlX1 = randomBetween(5, 59, random);
    const controlY1 = randomBetween(5, 59, random);
    const controlX2 = randomBetween(5, 59, random);
    const controlY2 = randomBetween(5, 59, random);
    
    path += ` C ${controlX1} ${controlY1} ${controlX2} ${controlY2} ${x} ${y}`;
  }
  
  return path;
}

/**
 * Generate circuit path
 */
function generateCircuitPath(random: () => number): string {
  const startX = randomBetween(8, 56, random);
  const startY = randomBetween(8, 56, random);
  
  let path = `M ${startX} ${startY}`;
  
  for (let i = 0; i < 5; i++) {
    const x = randomBetween(8, 56, random);
    const y = randomBetween(8, 56, random);
    path += ` L ${x} ${y}`;
  }
  
  return path;
}

/**
 * Generate nebula path
 */
function generateNebulaPath(random: () => number): string {
  const centerX = randomBetween(20, 44, random);
  const centerY = randomBetween(20, 44, random);
  const radius = randomBetween(10, 25, random);
  
  let path = `M ${centerX + radius} ${centerY}`;
  
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6;
    const r = radius + randomBetween(-8, 8, random);
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);
    
    if (i === 0) {
      path += ` Q ${x} ${y}`;
    } else {
      path += ` ${x} ${y}`;
    }
  }
  
  path += ' Z';
  return path;
}

/**
 * Generate cyber grid
 */
function generateCyberGrid(random: () => number): string {
  const startX = randomBetween(8, 56, random);
  const startY = randomBetween(8, 56, random);
  
  let path = `M ${startX} ${startY}`;
  
  for (let i = 0; i < 4; i++) {
    const x = randomBetween(8, 56, random);
    const y = randomBetween(8, 56, random);
    path += ` L ${x} ${y}`;
  }
  
  return path;
}

/**
 * Generate a simple favicon SVG (16x16)
 */
export function generateFaviconSVG(seed?: string): GeneratedSVG {
  return generateNFTSVG({
    width: 16,
    height: 16,
    viewBox: '0 0 16 16',
    style: 'geometric',
    complexity: 'simple'
  }, seed);
}

/**
 * Generate a logo SVG (64x64)
 */
export function generateLogoSVG(seed?: string): GeneratedSVG {
  return generateNFTSVG({
    width: 64,
    height: 64,
    viewBox: '0 0 64 64',
    style: 'tech',
    complexity: 'medium'
  }, seed);
}

/**
 * Generate multiple variations
 */
export function generateVariations(count: number = 5, style?: SVGConfig['style']): GeneratedSVG[] {
  const variations: GeneratedSVG[] = [];
  
  for (let i = 0; i < count; i++) {
    variations.push(generateNFTSVG({
      style: style || randomChoice(['geometric', 'tech', 'space', 'cyber'], () => Math.random())
    }));
  }
  
  return variations;
}

