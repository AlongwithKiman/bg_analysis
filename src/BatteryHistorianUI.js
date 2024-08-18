import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
  TimeScale,
  TimeSeriesScale,
  BarElement, // Import BarElement for the bar chart
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { getAverageTime } from './utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement, // Register BarElement for the bar chart
  Title,
  Tooltip,
  Filler,
  Legend,
  TimeScale,
  TimeSeriesScale
);

const data = [
  { start: '00:00:00', end: '00:15:00', state: 1 },
  { start: '00:30:00', end: '00:45:00', state: 0 },
  { start: '00:50:00', end: '01:15:00', state: 1 },
  { start: '01:20:00', end: '01:45:00', state: 1 },
  { start: '01:50:00', end: '02:30:00', state: 1 },
  // Add more segments as needed
];

const countingData = [
  { start: '00:00:00', end: '00:15:00', count: 1 },
  { start: '00:30:00', end: '00:45:00', count: 2 },
  { start: '00:50:00', end: '01:15:00', count: 3 },
  { start: '01:20:00', end: '01:45:00', count: 4 },
  { start: '01:50:00', end: '02:30:00', count: 50 },
  // Add more segments as needed
];

const transformData = (data) => {
  let minTime = '23:59:59';
  let maxTime = '00:00:00';

  const lineDatasets = data.map((segment) => {
    // Update min and max time based on the data
    if (segment.start < minTime) minTime = segment.start;
    if (segment.end > maxTime) maxTime = segment.end;

    return {
      label: segment.state === 0 ? 'Light' : 'Deep',
      borderColor: segment.state === 0 ? '#0000FF' : '#FFA500',
      backgroundColor: segment.state === 0 ? '#0000FF' : '#FFA500',
      yAxisID: 'y-doze',
      borderWidth: 10,
      fill: false,
      data: [
        { x: segment.start, y: 0 },
        { x: segment.end, y: 0 },
      ],
    };
  });

  const barDataset = {
    label: 'action Count',
    yAxisID: 'y-count',
    type: 'bar',
    backgroundColor: 'yellow',
    data: countingData.map((segment) => ({
      x: getAverageTime(segment.start, segment.end),
      y: segment.count,
    })),
  };

  const barDataset2 = {
    label: 'action Count2',
    yAxisID: 'y-count2',
    type: 'bar',
    backgroundColor: '#60FBC5',
    data: countingData.map((segment) => ({
      x: getAverageTime(segment.start, segment.end),
      y: segment.count + 3,
    })),
  };

  return {
    datasets: [...lineDatasets, barDataset, barDataset2],
    minTime,
    maxTime,
  };
};

const BatteryHistorianUI = () => {
  const { datasets, minTime, maxTime } = transformData(data);

  const options = {
    interaction: {
      mode: 'nearest',
      intersect: false,
    },

    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'minute',
          displayFormats: {
            minute: 'HH:mm:ss',
          },
          tooltipFormat: 'HH:mm:ss',
          parser: 'HH:mm:ss', // This ensures the time strings are parsed correctly
        },
        title: {
          display: true,
          text: 'Time (UTC)',
        },
        min: `1970-01-01T${minTime}`, // Dynamic minimum time
        max: `1970-01-01T${maxTime}`, // Dynamic maximum time
      },

      'y-count': {
        id: 'y-count',
        display: true,
        min: 0,
        max: 100,
      },
      'y-count2': {
        id: 'y-count2',
        display: false,
        min: 0,
        max: 100,
      },
      'y-doze': {
        id: 'y-doze',
        display: false,
        min: 0,
        max: 1,
      },
    },

    elements: {
      line: {
        tension: 0,
      },
      point: {
        radius: 0,
      },
    },

    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          title: function (tooltipItems) {
            if (tooltipItems[0].dataset.yAxisID === 'y-count') {
              // console.log(tooltipItems[0]);
              return `Interval: ${data[tooltipItems[0].dataIndex].start} ~ ${
                data[tooltipItems[0].dataIndex].end
              }`;
            } else return `${tooltipItems[0].dataset.label} doze`;
          },
        },
      },
    },
  };

  return (
    <div>
      <h2>Background History</h2>
      <Line data={{ datasets }} options={options} />
    </div>
  );
};

export default BatteryHistorianUI;
