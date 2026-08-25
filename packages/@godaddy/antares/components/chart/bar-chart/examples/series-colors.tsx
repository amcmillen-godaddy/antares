import { BarChart } from '@godaddy/antares';
import { cityTemperature } from '@visx/mock-data';

const ROWS = cityTemperature.slice(0, 10);

/**
 * Set `colorIndex` on a series to pin every bar in it to a specific color from the
 * shared nine-color palette. Give two series the same `colorIndex` and separate them
 * with `opacity` instead of hue — a common way to show a comparison period against the
 * current one while keeping a single color identity.
 * @title Series colors
 * @order 9
 */
export function SeriesColorsExample(props: any) {
  const series = [
    {
      id: 'this-period',
      name: 'This period',
      colorIndex: 1,
      data: ROWS.map((d) => ({ x: d.date, y: parseFloat(d['New York']) }))
    },
    {
      id: 'previous-period',
      name: 'Previous period',
      colorIndex: 1,
      opacity: 0.4,
      data: ROWS.map((d) => ({ x: d.date, y: parseFloat(d['New York']) * 0.88 }))
    }
  ];

  return (
    <BarChart
      series={series}
      xAccessor={(d: { x: string; y: number }) => d.x}
      yAccessor={(d: { x: string; y: number }) => d.y}
      xAxisTitle="Date"
      yAxisTitle="Temperature (°F)"
      yDomain={[0, 100]}
      xBaseline={true}
      yBaseline={true}
      xTickMarks={true}
      yTickMarks={true}
      aria-label="Series colors example bar chart"
      desc="Grouped bar chart where both series share one palette color via colorIndex and the comparison series is distinguished by reduced opacity"
      {...props}
    />
  );
}
