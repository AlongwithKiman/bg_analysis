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
    if (
      lines[i].includes('DeviceIdleController:') ||
      lines[i].includes('PowerManagerService:')
    ) {
      results.push(line);
    }
  }

  return results;
}

export function extractIntervals(lines) {
  const intervals = [];
  let deepStartTime = null;
  let lightStartTime = null;
  let screenOnStartTime = null;

  let endTime = null;

  for (const line of lines) {
    // Extract the timestamp and message from the line
    const timestamp = line.substring(0, 14); // Extract 'MM-DD HH:MM:SS'
    const message = line.substring(15); // Rest of the line after the timestamp

    // console.log(timestamp, message);
    // Check if the message contains '[DEEP] QUICK_DOZE_DELAY to IDLE'
    if (
      message.includes('[DEEP] QUICK_DOZE_DELAY to IDLE') ||
      message.includes('[DEEP] IDLE_MAINTENANCE to IDLE')
    ) {
      deepStartTime = timestamp;
      if (endTime) {
        intervals.push({
          start: endTime,
          end: deepStartTime,
          state: 2,
        });
        endTime = null;
      }
    }
    // Check if the message contains '[DEEP] IDLE to ACTIVE' and startTime is set
    else if (
      (message.includes('[DEEP] IDLE to ACTIVE') ||
        message.includes('[DEEP] IDLE to IDLE_MAINTENANCE')) &&
      deepStartTime
    ) {
      endTime = timestamp;
      intervals.push({
        start: deepStartTime,
        end: endTime,
        state: 0,
      });
      deepStartTime = null; // Reset startTime after creating an interval
    } else if (message.includes('[LIGHT] INACTIVE to IDLE')) {
      lightStartTime = timestamp;
      if (endTime) {
        intervals.push({
          start: endTime,
          end: lightStartTime,
          state: 2,
        });
        endTime = null;
      }
    } else if (message.includes('[LIGHT] IDLE to') && lightStartTime) {
      endTime = timestamp;
      intervals.push({
        start: lightStartTime,
        end: endTime,
        state: 1,
      });
      lightStartTime = null; // Reset startTime after creating an interval
    } else if (message.includes('PowerManagerService: Waking')) {
      console.log(timestamp, message);
      screenOnStartTime = timestamp;
      if (endTime) {
        intervals.push({
          start: endTime,
          end: screenOnStartTime,
          state: 2,
        });
        endTime = null;
      }
    } else if (
      message.includes('PowerManagerService: [api] goToSleep') &&
      screenOnStartTime
    ) {
      endTime = timestamp;
      intervals.push({
        start: screenOnStartTime,
        end: endTime,
        state: 3,
      });
      screenOnStartTime = null; // Reset startTime after creating an interval
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
          break;
        }
      }
    } else {
      break;
    }
  }
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

// Job Count Function
export function updateJobCount(intervals, dataString, baseDate) {
  console.log(intervals);
  // Interval 객체에 alarm_count 속성 추가
  intervals.forEach((interval) => (interval.job_count = 0));
  const intervalDates = intervals.map((interval) => ({
    start: parseDateTime(interval.start),
    end: parseDateTime(interval.end),
  }));

  const lines = dataString.split('\n');
  const scheduledJobTimes = [];

  // Initialize variables
  let startIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('DUMP OF SERVICE batterystats:')) {
      startIndex = i + 1;
    }
  }
  if (startIndex == -1) return intervals;
  for (let i = startIndex; i < lines.length; i++) {
    if (lines[i].trim() === '') break;

    if (lines[i].includes('+job=')) {
      // console.log(lines[i]);
      const date = lines[i].trim().split(' ')[0].substring(1);
      // console.log('date:', date, 'baseDate:', baseDate);
      // console.log('stringtodate result:', stringToDate(date, baseDate));
      scheduledJobTimes.push(stringToDate(date, baseDate)); // TODO
    }
  }

  for (let i = 0; i < scheduledJobTimes.length; i++) {
    const date = scheduledJobTimes[i];
    for (let j = 0; j < intervalDates.length; j++) {
      if (date >= intervalDates[j].start && date < intervalDates[j].end) {
        intervals[j].job_count += 1;
        console.log(intervals[j].job_count);
        break;
      }
    }
  }
  console.log(intervals);

  return intervals;
}

export function getLogStartDate(inputString) {
  // 정규 표현식을 사용하여 날짜와 시간을 추출합니다.
  const regex =
    /Last battery usage start=(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\.\d{3}/;
  const match = inputString.match(regex);

  if (match && match[1]) {
    // 추출된 날짜 문자열을 Date 객체로 변환합니다.
    const date = new Date(match[1]);
    date.setHours(date.getHours() + 9); // fix UTC+9 issue
    console.log('return date:', date);
    return date;
  } else {
    // 일치하는 부분이 없으면 null을 반환합니다.
    return null;
  }
}

function stringToDate(timeStr, baseDate) {
  // console.log('Start:', baseDate);
  const timePattern = /^(\d+d)?(\d+h)?(\d+m)?(\d+s)?(\d+ms)?/;
  const match = timeStr.match(timePattern);

  if (!match) {
    throw new Error('Invalid time string format');
  }

  let [_, days, hours, minutes, seconds, milliseconds] = match;
  days = days ? parseInt(days) : 0;
  hours = hours ? parseInt(hours) : 0;
  minutes = minutes ? parseInt(minutes) : 0;
  seconds = seconds ? parseInt(seconds) : 0;
  milliseconds = milliseconds ? parseInt(milliseconds) : 0;

  const date = new Date(baseDate);
  date.setDate(baseDate.getDate() + days);
  date.setHours(baseDate.getHours() + hours);
  date.setMinutes(baseDate.getMinutes() + minutes);
  date.setSeconds(baseDate.getSeconds() + seconds);

  return date;
}

export function roundUpToNearestTen(num) {
  const factor = Math.pow(10, Math.floor(Math.log10(num)));
  return Math.ceil(num / factor) * factor;
}
