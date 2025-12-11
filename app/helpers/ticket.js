const moment = require('moment');

/**
 * Calculates the number of business days between two dates.
 * Excludes Weekends (Sat/Sun) and Holidays.
 * * @param {string|Date} startDate - The ticket creation date
 * @param {string|Date} endDate - The ticket closed date (or current date if open)
 * @param {Array<string>} holidays - Array of holiday strings ['YYYY-MM-DD', ...]
 * @returns {number} - The number of business days
 */
const calculateBusinessDays = (startDate, endDate, holidays = []) => {
    if (!startDate || !endDate) return 0;

    let start = moment(startDate).startOf('day');
    let end = moment(endDate).startOf('day');

    // Safety check: if closed before created
    if (end.isBefore(start)) return 0;

    let businessDays = 0;
    let current = start.clone();

    // Loop through each day from start to end
    while (current.isBefore(end)) {
        // Move to the next day to check if it counts
        current.add(1, 'days');

        const dateStr = current.format('YYYY-MM-DD');
        const dayOfWeek = current.day(); // 0=Sun, 6=Sat

        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
        const isHoliday = holidays.includes(dateStr);

        // Increment only if it's a working day
        if (!isWeekend && !isHoliday) {
            businessDays++;
        }
    }

    return businessDays;
};

const isSlaCompliant = (start, end, holidayList) => {
    // 1. If closed before it started (data error), assume compliant or handle error
    if (moment(end).isBefore(start)) return true;

    // 2. Calculate the Deadline (The "Fast" Way)
    // We only want to add 3 BUSINESS days to the start date
    let deadline = moment(start);
    let businessDaysAdded = 0;
    
    // Max loop safety (e.g., if we need 3 business days, we rarely check more than 10 real days)
    // This loop runs CONSTANT time (very fast)
    while (businessDaysAdded < 3) {
        deadline.add(1, 'days');
        
        const dateStr = deadline.format('YYYY-MM-DD');
        const dayOfWeek = deadline.day(); // 0=Sun, 6=Sat
        
        // Check if weekend
        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
        
        // Check if holiday
        const isHoliday = holidayList.includes(dateStr);

        if (!isWeekend && !isHoliday) {
            businessDaysAdded++;
        }
    }

    // 3. Compare Actual Close Date vs Calculated Deadline
    // If we closed it ON or BEFORE the deadline, we are safe.
    return moment(end).isSameOrBefore(deadline);
};

module.exports = {
    calculateBusinessDays,
    isSlaCompliant
};