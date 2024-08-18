function timeStringToSeconds(timeString) {
  const [hours, minutes, seconds] = timeString.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

function secondsToTimeString(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return [
    String(hours).padStart(2, '0'),
    String(minutes).padStart(2, '0'),
    String(seconds).padStart(2, '0'),
  ].join(':');
}

export function getAverageTime(time1, time2) {
  const seconds1 = timeStringToSeconds(time1);
  const seconds2 = timeStringToSeconds(time2);
  const averageSeconds = Math.floor((seconds1 + seconds2) / 2);
  return secondsToTimeString(averageSeconds);
}
