/**
 * Converts a time string in the format "yy-dd HH:MM:SS" to total seconds.
 * @param {string} timeString - The time string to convert.
 * @returns {number} - The total seconds represented by the time string.
 */
function timeStringToSeconds(timeString) {
  const [yearDay, time] = timeString.split(' ');
  const [years, days] = yearDay.split('-').map(Number);
  const [hours, minutes, seconds] = time.split(':').map(Number);

  const totalDays = years * 365 + days;
  const totalSecondsFromDays = totalDays * 86400;
  const totalSecondsFromTime = hours * 3600 + minutes * 60 + seconds;

  return totalSecondsFromDays + totalSecondsFromTime;
}

/**
 * Converts total seconds to a time string in the format "yy-dd HH:MM:SS".
 * @param {number} totalSeconds - The total seconds to convert.
 * @returns {string} - The formatted time string.
 */
function secondsToTimeString(totalSeconds) {
  const secondsInDay = 86400;
  const secondsInYear = 365 * secondsInDay;

  const years = Math.floor(totalSeconds / secondsInYear);
  const remainingSecondsAfterYears = totalSeconds % secondsInYear;
  const days = Math.floor(remainingSecondsAfterYears / secondsInDay);
  const remainingSecondsAfterDays = remainingSecondsAfterYears % secondsInDay;

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

/**
 * Calculates the average time between two time strings and returns it in the "yy-dd HH:MM:SS" format.
 * @param {string} time1 - The first time string.
 * @param {string} time2 - The second time string.
 * @returns {string} - The average time string.
 */
export function getAverageTime(time1, time2) {
  const seconds1 = timeStringToSeconds(time1);
  const seconds2 = timeStringToSeconds(time2);
  const averageSeconds = Math.floor((seconds1 + seconds2) / 2);
  return secondsToTimeString(averageSeconds);
}

/**
 * Parses a wake lock log and extracts relevant lines containing specific keywords.
 * @param {string} inputString - The input log string.
 * @returns {string[]} - An array of extracted log lines.
 */
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

/**
 * Extracts intervals of different device states (deep, light, screen on) from the log lines.
 * @param {string[]} lines - The log lines to parse.
 * @returns {object[]} - An array of intervals with start and end times, and the device state.
 */
export function extractIntervals(lines) {
  const intervals = [];
  let deepStartTime = null;
  let lightStartTime = null;
  let screenOnStartTime = null;

  let endTime = null;

  for (const line of lines) {
    const timestamp = line.substring(0, 14); // Extract 'MM-DD HH:MM:SS'
    const message = line.substring(15); // Rest of the line after the timestamp

    // Deep doze mode starting point
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
    // Deep doze mode end point
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
      deepStartTime = null;
    }
    // light doze mode starting point
    else if (message.includes('[LIGHT] INACTIVE to IDLE')) {
      lightStartTime = timestamp;
      if (endTime) {
        intervals.push({
          start: endTime,
          end: lightStartTime,
          state: 2,
        });
        endTime = null;
      }
    }
    // Light doze mode end point
    else if (message.includes('[LIGHT] IDLE to') && lightStartTime) {
      endTime = timestamp;
      intervals.push({
        start: lightStartTime,
        end: endTime,
        state: 1,
      });
      lightStartTime = null;
    }
    // Screen On starting point
    else if (message.includes('PowerManagerService: Waking')) {
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
    }
    // Screen on end point
    else if (
      message.includes('PowerManagerService: [api] goToSleep') &&
      screenOnStartTime
    ) {
      endTime = timestamp;
      intervals.push({
        start: screenOnStartTime,
        end: endTime,
        state: 3,
      });
      screenOnStartTime = null;
    }
  }

  return intervals;
}

/**
 * Updates the alarm count for each interval based on the provided data string.
 * @param {object[]} intervals - The intervals to update.
 * @param {string} dataString - The data string containing alarm information.
 * @returns {object[]} - The updated intervals with alarm counts.
 */
export function updateAlarmCount(intervals, dataString) {
  // Interval 객체에 alarm_count 속성 추가
  intervals.forEach((interval) => (interval.alarm_count = 0));
  const intervalDates = intervals.map((interval) => ({
    start: parseDateTime(interval.start),
    end: parseDateTime(interval.end),
  }));

  const lines = dataString.split('\n');

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
  // for (let i = 0; i < intervals.length; i++) {
  //   intervals[i].alarm_count =
  //     intervals[i].alarm_count /
  //     ((timeStringToSeconds(intervals[i].end) -
  //       timeStringToSeconds(intervals[i].start)) /
  //       60);
  // }
  return intervals;
}

/**
 * Converts a date-time string in the format "MM-DD HH:MM:SS" to a Date object.
 * @param {string} dateTimeStr - The date-time string to convert.
 * @returns {Date} - The corresponding Date object.
 */
function parseDateTime(dateTimeStr) {
  const [date, time] = dateTimeStr.split(' ');
  const [month, day] = date.split('-').map(Number);
  const [hour, minute, second] = time.split(':').map(Number);

  // 현재 연도를 기준으로 Date 객체 생성
  const now = new Date();
  return new Date(now.getFullYear(), month - 1, day, hour, minute, second);
}

/**
 * Updates the job count for each interval based on the provided data string.
 * @param {object[]} intervals - The intervals to update.
 * @param {string} dataString - The data string containing job information.
 * @param {Date} baseDate - The base date to use for parsing job times.
 * @returns {object[]} - The updated intervals with job counts.
 */
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
  // for (let i = 0; i < intervals.length; i++) {
  //   intervals[i].job_count =
  //     intervals[i].job_count /
  //     ((timeStringToSeconds(intervals[i].end) -
  //       timeStringToSeconds(intervals[i].start)) /
  //       60);
  // }

  return intervals;
}

/**
 * Extracts the start date of the log from the input string.
 * @param {string} inputString - The input log string.
 * @returns {Date|null} - The extracted start date as a Date object, or null if not found.
 */
export function getLogStartDate(inputString) {
  const regex =
    /Last battery usage start=(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\.\d{3}/;
  const match = inputString.match(regex);

  if (match && match[1]) {
    const date = new Date(match[1]);
    date.setHours(date.getHours() + 9); // fix UTC+9 issue
    console.log('return date:', date);
    return date;
  } else {
    return null;
  }
}

/**
 * Converts a time string in the format "Xd Xh Xm Xs Xms" to a Date object relative to a base date.
 * @param {string} timeStr - The time string to convert.
 * @param {Date} baseDate - The base date to which the time string is relative.
 * @returns {Date} - The calculated Date object.
 */
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

/**
 * Rounds a number up to the nearest power of ten.
 * @param {number} num - The number to round up.
 * @returns {number} - The rounded number.
 */
export function roundUpToNearestTen(num) {
  const factor = Math.pow(10, Math.floor(Math.log10(num)));
  return Math.ceil(num / factor) * factor;
}
