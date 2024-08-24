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

  for (const line of lines) {
    // Extract the timestamp and message from the line
    const timestamp = line.substring(0, 14); // Extract 'MM-DD HH:MM:SS'
    const message = line.substring(15); // Rest of the line after the timestamp

    // Check if the message contains '[DEEP] QUICK_DOZE_DELAY to IDLE'
    if (message.includes('[DEEP] QUICK_DOZE_DELAY to IDLE')) {
      startTime = timestamp;
    }
    // Check if the message contains '[DEEP] IDLE to ACTIVE' and startTime is set
    else if (message.includes('[DEEP] IDLE to ACTIVE') && startTime) {
      intervals.push({
        start: startTime,
        end: timestamp,
        state: 0,
        count1: 10,
        count2: 15,
      });
      startTime = null; // Reset startTime after creating an interval
    }
  }

  return intervals;
}
