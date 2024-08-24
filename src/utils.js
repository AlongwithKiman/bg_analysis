// Convert yy-dd HH:MM:SS to total seconds
function timeStringToSeconds(timeString) {
  const [yearDay, time] = timeString.split(' ');
  const [years, days] = yearDay.split('-').map(Number);
  const [hours, minutes, seconds] = time.split(':').map(Number);

  // Convert years and days to total seconds
  const totalDays = years * 365 + days; // This does not account for leap years
  const totalSecondsFromDays = totalDays * 86400; // 86400 seconds in a day

  // Convert hours, minutes, and seconds to total seconds
  const totalSecondsFromTime = hours * 3600 + minutes * 60 + seconds;

  return totalSecondsFromDays + totalSecondsFromTime;
}

// Convert total seconds to yy-dd HH:MM:SS
function secondsToTimeString(totalSeconds) {
  const secondsInDay = 86400; // Seconds in a day
  const secondsInYear = 365 * secondsInDay; // Seconds in a year (assuming 365 days per year)

  // Calculate years and remaining days
  const years = Math.floor(totalSeconds / secondsInYear);
  const remainingSecondsAfterYears = totalSeconds % secondsInYear;
  const days = Math.floor(remainingSecondsAfterYears / secondsInDay);
  const remainingSecondsAfterDays = remainingSecondsAfterYears % secondsInDay;

  // Calculate hours, minutes, and seconds
  const hours = Math.floor(remainingSecondsAfterDays / 3600);
  const remainingSecondsAfterHours = remainingSecondsAfterDays % 3600;
  const minutes = Math.floor(remainingSecondsAfterHours / 60);
  const seconds = remainingSecondsAfterHours % 60;

  return [
    `${years.toString().padStart(2, '0')}-${days.toString().padStart(2, '0')}`,
    [hours, minutes, seconds]
      .map((num) => num.toString().padStart(2, '0'))
      .join(':'),
  ].join(' ');
}

// Calculate the average time between two time strings
export function getAverageTime(time1, time2) {
  const seconds1 = timeStringToSeconds(time1);
  const seconds2 = timeStringToSeconds(time2);
  const averageSeconds = Math.floor((seconds1 + seconds2) / 2);
  return secondsToTimeString(averageSeconds);
}

export function parseWakeLockLog(inputString) {
  // Split the input string into lines
  const lines = inputString.split('\n');

  // Initialize variables
  let startIndex = -1;
  const results = [];

  // Regular expression to match the log line format
  const logLineRegex = /^\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} .*/;

  // Find the line containing 'Wake Lock Log'
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') {
      // Stop at empty lines if necessary
      continue;
    }
    if (lines[i].includes('DeviceIdleController:')) {
      results.push(line);
    }
  }

  return results;
}

export function extractIntervals(lines) {
  const intervals = [];
  let startTime = null;
  let endTime = null;

  for (const line of lines) {
    // Extract the timestamp and message from the line
    const timestamp = line.substring(0, 14); // Extract 'MM-DD HH:MM:SS'
    const message = line.substring(15); // Rest of the line after the timestamp

    // Check if the message contains '[DEEP] QUICK_DOZE_DELAY to IDLE'
    if (message.includes('[DEEP] QUICK_DOZE_DELAY to IDLE')) {
      startTime = timestamp;
      if (endTime) {
        intervals.push({
          start: endTime,
          end: startTime,
          state: 2,
          count1: 10,
          count2: 15,
        });
      }
    }
    // Check if the message contains '[DEEP] IDLE to ACTIVE' and startTime is set
    else if (message.includes('[DEEP] IDLE to ACTIVE') && startTime) {
      endTime = timestamp;
      intervals.push({
        start: startTime,
        end: endTime,
        state: 0,
        count1: 10,
        count2: 15,
      });
      startTime = null; // Reset startTime after creating an interval
    }
  }

  return intervals;
}

export function updateAlarmCount(intervals, dataString) {
  // Interval 객체에 alarm_count 속성 추가
  intervals.forEach((interval) => (interval.alarm_count = 0));
  const intervalDates = intervals.map((interval) => ({
    start: parseDateTime(interval.start),
    end: parseDateTime(interval.end),
  }));

  const lines = dataString.split('\n');

  // Initialize variables
  let startIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Wakeup Alarm history(screen off):')) {
      startIndex = i + 1;
    }
  }
  if (startIndex == -1) return intervals;

  const logLineRegex = /^ *rtc=\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}.*$/;

  for (let i = startIndex; i < lines.length; i++) {
    const match = lines[i].match(logLineRegex);
    if (match) {
      const date = parseDateTime(lines[i].trim().substring(9, 23)); // yyyy-mm-dd HH:MM:SS 형식으로 변환

      for (let j = 0; j < intervalDates.length; j++) {
        if (date >= intervalDates[j].start && date < intervalDates[j].end) {
          intervals[j].alarm_count += 1;
          console.log(intervals[j].alarm_count);
          break;
        }
      }
    } else {
      break;
    }
  }
  console.log(intervals);

  return intervals;
}

// (mm-dd HH:MM:SS) 형식의 문자열을 Date 객체로 변환
function parseDateTime(dateTimeStr) {
  const [date, time] = dateTimeStr.split(' ');
  const [month, day] = date.split('-').map(Number);
  const [hour, minute, second] = time.split(':').map(Number);

  // 현재 연도를 기준으로 Date 객체 생성
  const now = new Date();
  return new Date(now.getFullYear(), month - 1, day, hour, minute, second);
}
