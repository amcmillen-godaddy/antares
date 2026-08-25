import { BarChart } from '@godaddy/antares';

/**
 * `categoryColors` maps individual category values to palette color indices, overriding
 * the series color for just those bars — so a single series can carry a different color
 * per category. Pair it with a second, lower-`opacity` series to compare two periods
 * while keeping each channel's color identity. Here both periods share the same
 * category-to-color map; the previous period is dropped to 35% opacity.
 * @title Category colors
 * @order 10
 */
export function CategoryColorsExample(props: any) {
  // Sales channel → palette color index (blue, teal, orange, magenta, navy).
  const categoryColors = {
    'In Person': 1,
    'Online Store': 0,
    'Pay Links': 2,
    Invoicing: 3,
    'Virtual Terminal': 5
  };

  const current = [
    { channel: 'In Person', amount: 1043.5 },
    { channel: 'Online Store', amount: 692.12 },
    { channel: 'Pay Links', amount: 618.4 },
    { channel: 'Invoicing', amount: 431.8 },
    { channel: 'Virtual Terminal', amount: 182.25 }
  ];

  const previous = [
    { channel: 'In Person', amount: 918.0 },
    { channel: 'Online Store', amount: 604.75 },
    { channel: 'Pay Links', amount: 560.0 },
    { channel: 'Invoicing', amount: 372.5 },
    { channel: 'Virtual Terminal', amount: 96.5 }
  ];

  const series = [
    {
      id: 'this-period',
      name: 'This period',
      categoryColors,
      data: current.map((d) => ({ x: d.amount, y: d.channel }))
    },
    {
      id: 'previous-period',
      name: 'Previous period',
      categoryColors,
      opacity: 0.35,
      data: previous.map((d) => ({ x: d.amount, y: d.channel }))
    }
  ];

  return (
    <BarChart
      series={series}
      orientation="horizontal"
      xAccessor={(d: { x: number; y: string }) => d.x}
      yAccessor={(d: { x: number; y: string }) => d.y}
      xTickFormat={(value) => `$${Number(value).toLocaleString()}`}
      xDomain={[0, 1100]}
      xGridlines={true}
      yBaseline={true}
      legendPosition={null}
      height={450}
      aria-label="Payment activity by sales channel"
      desc="Horizontal bar chart of net payments per sales channel for two periods; each channel keeps its own color via categoryColors and the previous period is shown at reduced opacity"
      {...props}
    />
  );
}
