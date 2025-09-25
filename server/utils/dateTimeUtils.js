// utils/dateTimeUtils.js
class DateTimeUtils {
  static getISTDate(date = new Date()) {
    const istOffset = 5.5 * 60 * 60 * 1000;
    const utc = date.getTime() + date.getTimezoneOffset() * 60000;
    return new Date(utc + istOffset);
  }

  static formatIST(date, options = {}) {
    const istDate = this.getISTDate(date);
    return istDate.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      ...options
    });
  }

  static getStartOfDayIST(date = new Date()) {
    const istDate = this.getISTDate(date);
    return new Date(istDate.setHours(0, 0, 0, 0));
  }

  static getEndOfDayIST(date = new Date()) {
    const istDate = this.getISTDate(date);
    return new Date(istDate.setHours(23, 59, 59, 999));
  }

  static isSameDayIST(date1, date2) {
    const d1 = this.getStartOfDayIST(date1).toDateString();
    const d2 = this.getStartOfDayIST(date2).toDateString();
    return d1 === d2;
  }
}

module.exports = DateTimeUtils;