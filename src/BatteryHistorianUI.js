import React, { useEffect, useRef, useState } from 'react';
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
import Button from '@mui/material/Button';
import 'chartjs-adapter-date-fns';
import {
  extractIntervals,
  getAverageTime,
  getLogStartDate,
  parseWakeLockLog,
  updateAlarmCount,
  updateJobCount,
} from './utils';

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

// const data = [
//   { start: '08-24 00:00:00', end: '08-24 00:15:00', state: 1 },
//   { start: '08-24 00:30:00', end: '08-24 00:45:00', state: 0 },
//   { start: '08-24 00:50:00', end: '08-24 01:15:00', state: 1 },
//   { start: '08-24 01:20:00', end: '08-24 01:45:00', state: 1 },
//   { start: '08-24 01:50:00', end: '08-24 02:30:00', state: 1 },
//   { start: '08-24 02:50:00', end: '08-24 03:30:00', state: 0 },
//   // Add more segments as needed
// ];

const data = [
  {
    start: '08-24 00:00:00',
    end: '08-24 00:15:00',
    state: 1,
    count1: 15,
    count2: 10,
  },
  {
    start: '08-24 00:15:00',
    end: '08-24 00:30:00',
    state: 2,
    count1: 15,
    count2: 10,
  },
  {
    start: '08-24 00:30:00',
    end: '08-24 00:45:00',
    state: 0,
    count1: 8,
    count2: 14,
  },
  {
    start: '08-24 00:45:00',
    end: '08-24 00:50:00',
    state: 2,
    count1: 15,
    count2: 10,
  },
  {
    start: '08-24 00:50:00',
    end: '08-24 01:15:00',
    state: 1,
    count1: 14,
    count2: 19,
  },
  {
    start: '08-24 01:15:00',
    end: '08-24 01:20:00',
    state: 2,
    count1: 15,
    count2: 10,
  },
  {
    start: '08-24 01:20:00',
    end: '08-24 01:45:00',
    state: 1,
    count1: 16,
    count2: 21,
  },
  {
    start: '08-24 01:45:00',
    end: '08-24 01:50:00',
    state: 2,
    count1: 15,
    count2: 10,
  },
  {
    start: '08-24 01:50:00',
    end: '08-24 02:30:00',
    state: 1,
    count1: 50,
    count2: 30,
  },
  {
    start: '08-24 02:30:00',
    end: '08-24 02:50:00',
    state: 2,
    count1: 15,
    count2: 10,
  },
  {
    start: '08-24 02:50:00',
    end: '08-24 03:30:00',
    state: 0,
    count1: 30,
    count2: 25,
  },

  // Add more segments as needed
];

const transformData = (inputData) => {
  let minTime = '23:59:59';
  let maxTime = '00:00:00';

  const datasetForLine = inputData.filter((data) => data.state != 2);
  const lineDatasets = datasetForLine.map((segment) => {
    // Update min and max time based on the data
    if (segment.start < minTime) minTime = segment.start;
    if (segment.end > maxTime) maxTime = segment.end;

    return {
      label: segment.state === 0 ? 'Deep' : 'Light',
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
    label: 'alarm_count',
    yAxisID: 'y-count',
    type: 'bar',
    backgroundColor: 'red',
    barThickness: 10,
    data: inputData.map((segment) => ({
      x: getAverageTime(segment.start, segment.end),
      y: segment.alarm_count,
    })),
  };

  const barDataset2 = {
    label: 'job_count',
    yAxisID: 'y-count2',
    type: 'bar',
    backgroundColor: 'green',
    barThickness: 10,

    data: inputData.map((segment) => ({
      x: getAverageTime(segment.start, segment.end),
      y: segment.job_count,
    })),
  };

  return {
    datasets: [...lineDatasets, barDataset, barDataset2],
    minTime,
    maxTime,
  };
};

const BatteryHistorianUI = () => {
  const [createdIntervals, setCreatedIntervals] = useState([]);
  const fileInputRef = useRef(null);

  const onFileInputChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileContent = e.target.result;
        const logStartDate = getLogStartDate(fileContent);
        const intervals = extractIntervals(parseWakeLockLog(fileContent));
        const intervalsWithAlarm = updateAlarmCount(intervals, fileContent);

        const intervalsWithAlarmAndJob = updateJobCount(
          intervalsWithAlarm,
          fileContent,
          logStartDate
        );
        setCreatedIntervals(intervalsWithAlarmAndJob);
      };
      reader.readAsText(file);
    } else {
      alert('Please upload a .txt file');
    }
  };

  const onClickUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const { datasets, minTime, maxTime } = transformData(createdIntervals);
  // const { datasets, minTime, maxTime } = transformData(data);

  const max_cnt =
    createdIntervals.length > 0
      ? Math.max(...createdIntervals.map((elem) => elem.alarm_count))
      : 50;

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
            minute: 'yy-dd HH:mm:ss',
          },
          tooltipFormat: 'yy-dd HH:mm:ss',
          parser: 'yy-dd HH:mm:ss', // This ensures the time strings are parsed correctly
        },
        title: {
          display: true,
          text: 'Time (UTC)',
        },
        ticks: {
          source: 'auto', // Automatically generate ticks based on the data
          autoSkip: true, // Skip labels if they overlap
          maxTicksLimit: 24, // Limit the number of ticks displayed
          align: 'start',
        },
        min: `1970-01-01T${minTime}`, // Dynamic minimum time
        max: `1970-01-01T${maxTime}`, // Dynamic maximum time
      },

      'y-count': {
        id: 'y-count',
        display: true,
        min: 0,
        max: max_cnt * 2,
      },
      'y-count2': {
        id: 'y-count2',
        display: false,
        min: 0,
        max: max_cnt * 2,
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
              return `Interval: ${
                createdIntervals[tooltipItems[0].dataIndex].start
              } ~ ${createdIntervals[tooltipItems[0].dataIndex].end}`;
            } else return `${tooltipItems[0].dataset.label} doze`;
          },
        },
      },
    },
  };

  return (
    <div style={{ paddingLeft: '20px' }}>
      {createdIntervals.map((elem) => (
        <div>
          {elem.start} ~ {elem.end}
        </div>
      ))}
      <div style={{ margin: '16px' }}>
        <input
          type='file'
          onChange={onFileInputChange}
          ref={fileInputRef}
          style={{ display: 'none' }}
        />
        <Button variant='contained' component='span' onClick={onClickUpload}>
          Upload File
        </Button>
      </div>
      <h2>Background History</h2>
      <div
        style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}
      >
        <div
          style={{
            backgroundColor: 'red',
            width: '20px',
            height: '20px',
            marginRight: '5px',
          }}
        ></div>
        <span>alarm_count</span>
        <div
          style={{
            backgroundColor: 'green',
            width: '20px',
            height: '20px',
            marginRight: '5px',
            marginLeft: '15px',
          }}
        ></div>
        <span>job_count</span>
      </div>
      <Line data={{ datasets }} options={options} />
    </div>
  );
};

export default BatteryHistorianUI;
