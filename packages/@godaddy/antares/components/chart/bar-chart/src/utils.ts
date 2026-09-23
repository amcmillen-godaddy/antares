import type { SeriesConfig } from '../../types.ts';

/** Chart margin offsets in pixels for each side. */
export interface Margin {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Tooltip payload for a hovered bar group.
 */
export interface BarTooltipData<T = unknown> {
  x: number | string | Date;
  y?: number;
  /** Each series' datum at the hovered group, keyed by series id. */
  datumByKey: Record<string, { datum: T }>;
}

/**
 * Normalizes a category value to a stable string key so equal categories compare equal
 * regardless of type.
 *
 * @param value - A category value (or null/undefined)
 * @returns A string key, or null when there is no category
 */
function categoryKey(value: number | string | Date | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value instanceof Date ? value.getTime().toString() : String(value);
}

/**
 * Extracts the ordered list of unique category values across all series.
 * In vertical orientation, categories come from xAccessor; in horizontal, from yAccessor.
 * Deduplication uses string key comparison so that Dates with the same timestamp are treated as equal.
 *
 * @param series - All data series in the chart
 * @param isVertical - True for vertical orientation (x is categorical)
 * @param xAccessor - Accessor to extract the x value from a datum
 * @param yAccessor - Accessor to extract the y value from a datum
 * @returns Ordered array of unique category values (number, string, or Date)
 */
export function getCategoryValues<T extends object>(
  series: SeriesConfig<T>[],
  isVertical: boolean,
  xAccessor: (d: T) => number | string | Date,
  yAccessor: (d: T) => number | string | Date | null
): Array<number | string | Date> {
  if (!series || series.length === 0) return [];
  const values: Array<number | string | Date> = [];
  const seen = new Set<string>();
  const accessor = (datum: T) => (isVertical ? xAccessor(datum) : yAccessor(datum));
  for (const s of series) {
    if (!s?.data) continue;
    for (const d of s.data) {
      const v = accessor(d);
      if (v === null || v === undefined) continue;
      const key = categoryKey(v) as string;
      if (!seen.has(key)) {
        seen.add(key);
        values.push(v as number | string | Date);
      }
    }
  }
  return values;
}

/**
 * Finds the datum in a series whose category matches `catValue`. Matching is by category
 * value (via the category accessor), not by array position, so a series with genuinely sparse
 * data — e.g. `[A, C]` against a global `[A, B, C]` — associates each value with the right
 * category instead of the slot it happens to occupy. Returns undefined when the series has no
 * datum for that category, letting callers skip rendering a bar or tooltip row for it.
 *
 * @param data - The series data points
 * @param categoryAccessor - Extracts the category value from a datum (x when vertical, y when horizontal)
 * @param catValue - The category value to match
 * @returns The matching datum, or undefined if the series has none for that category
 */
export function findDatumByCategory<T>(
  data: readonly T[],
  categoryAccessor: (d: T) => number | string | Date | null,
  catValue: number | string | Date
): T | undefined {
  const targetKey = categoryKey(catValue);
  return data.find(function matchesCategory(d) {
    return categoryKey(categoryAccessor(d)) === targetKey;
  });
}

/**
 * Computes the inner and total SVG dimensions for the chart.
 * When the data requires more space than the container provides (e.g. many bar groups),
 * the inner dimension expands beyond the container so the chart scrolls.
 *
 * @param chartWidth - Available container width in pixels
 * @param chartHeight - Available container height in pixels
 * @param margin - Physical chart margin (already RTL-mapped by `useScrollableXYChart`)
 * @param numGroups - Number of category groups (sets of bars)
 * @param totalBarWidth - Combined pixel width of all bars in one group
 * @param minGapBetweenGroups - Minimum pixel gap required between groups
 * @param isVertical - True for vertical orientation
 * @returns innerWidth, innerHeight, svgWidth, svgHeight in pixels
 */
export function computeChartDimensions({
  chartWidth,
  chartHeight,
  margin,
  numGroups,
  totalBarWidth,
  minGapBetweenGroups,
  isVertical
}: {
  chartWidth: number;
  chartHeight: number;
  margin: Margin;
  numGroups: number;
  totalBarWidth: number;
  minGapBetweenGroups: number;
  isVertical: boolean;
}) {
  const baseInnerWidth = Math.max(chartWidth - margin.left - margin.right, 0);
  const baseInnerHeight = Math.max(chartHeight - margin.top - margin.bottom, 0);
  const minSpacePerGroup = totalBarWidth + minGapBetweenGroups;
  const innerWidth = isVertical ? Math.max(baseInnerWidth, numGroups * minSpacePerGroup) : baseInnerWidth;
  const innerHeight = !isVertical ? Math.max(baseInnerHeight, numGroups * minSpacePerGroup) : baseInnerHeight;
  const svgWidth = innerWidth + margin.left + margin.right;
  const svgHeight = innerHeight + margin.top + margin.bottom;
  return { innerWidth, innerHeight, svgWidth, svgHeight };
}

/**
 * Computes the inner and outer padding values for the band scale that positions bar groups.
 * `paddingInner` controls the gap between groups; `paddingOuter` adds space before the first
 * and after the last group (non-zero only for vertical orientation).
 *
 * @param innerWidth - Inner chart width in pixels
 * @param innerHeight - Inner chart height in pixels
 * @param numGroups - Number of category groups
 * @param totalBarWidth - Combined pixel width of all bars in one group
 * @param minGapBetweenGroups - Minimum pixel gap between groups
 * @param isVertical - True for vertical orientation
 * @returns paddingInner and paddingOuter as ratios for the band scale
 */
export function computeBarGroupSpacing({
  innerWidth,
  innerHeight,
  numGroups,
  totalBarWidth,
  minGapBetweenGroups,
  isVertical
}: {
  innerWidth: number;
  innerHeight: number;
  numGroups: number;
  totalBarWidth: number;
  minGapBetweenGroups: number;
  isVertical: boolean;
}) {
  const availableSpace = isVertical ? innerWidth - numGroups * totalBarWidth : innerHeight - numGroups * totalBarWidth;
  const actualGap = numGroups > 1 ? availableSpace / (numGroups - 1) : 0;
  const paddingInner = numGroups > 1 ? Math.max(minGapBetweenGroups, actualGap) / totalBarWidth : 0;
  const paddingOuter = isVertical ? 0.6 : 0;
  return { paddingInner, paddingOuter };
}

/**
 * Wraps a user-supplied tick format function to ensure the value is always
 * passed as a number, Date, or string (never a raw visx scale tick object).
 *
 * @param tickFormat - Optional user-supplied formatter
 * @returns A wrapped formatter compatible with visx axis tick props, or undefined if no formatter was provided
 */
export function createTickFormatter(tickFormat: ((value: number | string | Date) => string) | undefined) {
  if (!tickFormat) return undefined;
  return function formatTick(value: any) {
    if (value instanceof Date || typeof value === 'number') return tickFormat(value);
    return tickFormat(String(value));
  };
}

/** Input options for {@link computeTooltipPosition}. */
interface TooltipPositionOptions {
  isVertical: boolean;
  rtl: boolean;
  groupIndex: number;
  series: SeriesConfig<any>[];
  categoryValues: Array<number | string | Date>;
  xScale: (value: any) => number | undefined;
  yScale: (value: any) => number | undefined;
  categoryScale: { bandwidth: () => number };
  valueScale: (value: any) => number | undefined;
  innerHeight: number;
  innerWidth: number;
  totalBarWidth: number;
  margin: Margin;
  svgWidth: number;
  svgRect: DOMRect;
  tooltipArrowHeight: number;
  xAccessor: (d: any) => any;
  yAccessor: (d: any) => any;
}

/**
 * Computes the pixel position and data payload for the bar chart tooltip.
 * In vertical orientation, the tooltip appears above the tallest bar in the hovered group,
 * horizontally centred over the group. In horizontal orientation, it appears above the group
 * row, horizontally positioned at the tip of the longest bar.
 *
 * @param options - {@link TooltipPositionOptions}
 * @returns tooltipLeft and tooltipTop in page coordinates, and tooltipData keyed by series id
 */
export function computeTooltipPosition({
  isVertical,
  rtl,
  groupIndex,
  series,
  categoryValues,
  xScale,
  yScale,
  categoryScale,
  valueScale,
  innerHeight,
  innerWidth,
  totalBarWidth,
  margin,
  svgWidth,
  svgRect,
  tooltipArrowHeight,
  xAccessor,
  yAccessor
}: TooltipPositionOptions) {
  const catValue = categoryValues[groupIndex];
  const categoryAccessor = isVertical ? xAccessor : yAccessor;
  const datumBySeries = series.map(function resolveDatum(s) {
    return {
      id: s.id,
      datum: findDatumByCategory(s.data, categoryAccessor, catValue)
    };
  });

  const datumByKey = datumBySeries.reduce(function buildDatum(acc: any, { id, datum }) {
    if (datum !== undefined) {
      acc[id] = { datum };
    }
    return acc;
  }, {});

  if (isVertical) {
    let minY = innerHeight;
    for (const { datum } of datumBySeries) {
      const yValue = datum !== undefined ? yAccessor(datum) : null;
      if (yValue !== null) {
        minY = Math.min(minY, (yScale(yValue as number) as number) ?? minY);
      }
    }
    const groupCenter = (xScale(categoryValues[groupIndex] as any) ?? 0) as number;
    const groupOffset = (categoryScale.bandwidth() - totalBarWidth) / 2;
    const barGroupCenter = groupCenter + groupOffset + totalBarWidth / 2;
    const tooltipLeft = rtl
      ? svgRect.left + window.scrollX + svgWidth - margin.right - barGroupCenter
      : svgRect.left + window.scrollX + margin.left + barGroupCenter;
    return {
      tooltipLeft,
      tooltipTop: svgRect.top + window.scrollY + margin.top + minY - tooltipArrowHeight,
      tooltipData: { x: groupCenter, y: minY, datumByKey }
    };
  }

  let extremeX = rtl ? innerWidth : 0;
  for (const { datum } of datumBySeries) {
    const xValue = datum !== undefined ? xAccessor(datum) : null;
    if (xValue !== null) {
      const scaledX = (valueScale(xValue as number) as number) ?? 0;
      extremeX = rtl ? Math.min(extremeX, scaledX) : Math.max(extremeX, scaledX);
    }
  }
  const yPos = (yScale(catValue as any) as number) || 0;
  const groupOffset = (categoryScale.bandwidth() - totalBarWidth) / 2;
  const barGroupTop = yPos + groupOffset;
  const tooltipXOffset = rtl ? (extremeX + innerWidth) / 2 : extremeX / 2;
  return {
    tooltipLeft: svgRect.left + window.scrollX + margin.left + tooltipXOffset,
    tooltipTop: svgRect.top + window.scrollY + margin.top + barGroupTop - tooltipArrowHeight,
    tooltipData: { x: catValue, datumByKey }
  };
}
