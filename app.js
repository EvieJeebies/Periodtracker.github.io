const STORAGE_KEY = 'cycleTrackerData';
let currentDate = new Date();
let periodStartDate = null;

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

function setCookie(name, value, days = 365) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/`;
}

let calendarData;

try {
    const cookieData = getCookie(STORAGE_KEY);
    calendarData = cookieData ? JSON.parse(cookieData) : [];
} catch (error) {
    console.error('Error parsing cookie data:', error);
    calendarData = [];
}

function saveData() {
    setCookie(STORAGE_KEY, JSON.stringify(calendarData));
}

function generateCalendar(date) {
    const calendar = document.getElementById('calendar');
    console.log('Calendar element:', calendar);
    if (!calendar) {
        console.error('Calendar element not found!');
        return;
    }

    calendar.innerHTML = '';
    
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    document.getElementById('currentMonth').textContent = 
        `${date.toLocaleString('default', { month: 'long' })} ${year}`;

    
    for (let i = 0; i < firstDay.getDay(); i++) {
        const emptyDay = document.createElement('div');
        emptyDay.classList.add('day');
        calendar.appendChild(emptyDay);
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
        const dateStr = new Date(year, month, day).toISOString().split('T')[0];
        const dayElement = document.createElement('div');
        dayElement.classList.add('day');
        dayElement.textContent = day;
        
        
        const isMarked = calendarData.some(period => 
            dateStr >= period.start && dateStr <= period.end
        );

        if (isMarked) {
            dayElement.classList.add('marked');
        }


        if (periodStartDate === dateStr) {
            dayElement.classList.add('selected-start');
        }

        dayElement.addEventListener('click', () => {
            
            handlePeriodSelection(dateStr, dayElement);
        });

        calendar.appendChild(dayElement);
    }

    console.log('Calendar generated successfully'); 
}

function handlePeriodSelection(dateStr, dayElement) {

    const periodIndex = calendarData.findIndex(period => 
        dateStr >= period.start && dateStr <= period.end
    );

    if (periodIndex !== -1) {
        
        const period = calendarData[periodIndex];
        const confirmDelete = confirm(`Do you want to delete the period from ${formatDate(new Date(period.start))} to ${formatDate(new Date(period.end))}?`);

        if (confirmDelete) {
            
            calendarData.splice(periodIndex, 1);

            
            saveData();
            generateCalendar(currentDate);
            updatePredictions();
        }
    } else if (!periodStartDate) {
        
        periodStartDate = dateStr;
        dayElement.classList.add('selected-start'); 
    } else {
        
        const startDate = new Date(periodStartDate);
        const endDate = new Date(dateStr);

        if (endDate < startDate) {
            
            [startDate, endDate] = [endDate, startDate];
        }

        
        calendarData.push({
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0]
        });

        
        periodStartDate = null;
        generateCalendar(currentDate);


        saveData();
        updatePredictions();
    }
}

function updatePredictions() {
    const periods = calendarData.sort((a, b) => new Date(a.start) - new Date(b.start));
    const lastPeriod = periods[periods.length - 1];
    const averageCycle = calculateAverageCycle(periods);
    
    document.getElementById('lastPeriod').textContent = 
        lastPeriod ? `${formatDate(new Date(lastPeriod.start))} - ${formatDate(new Date(lastPeriod.end))}` : '-';
    
    document.getElementById('averageCycle').textContent = 
        averageCycle ? `${Math.round(averageCycle)} days` : '-';
    
    document.getElementById('nextPredicted').textContent = 
        lastPeriod && averageCycle ? 
        formatDate(predictNextDate(new Date(lastPeriod.start), averageCycle)) : '-';
}

function calculateAverageCycle(periods) {
    if (periods.length < 2) return null;
    const diffs = [];
    
    for (let i = 1; i < periods.length; i++) {
        const diff = (new Date(periods[i].start) - new Date(periods[i-1].start)) / (86400000);
        diffs.push(diff);
    }
    
    return diffs.reduce((a, b) => a + b, 0) / diffs.length;
}

function predictNextDate(lastStart, averageCycle) {
    const nextDate = new Date(lastStart);
    nextDate.setDate(nextDate.getDate() + Math.round(averageCycle));
    return nextDate;
}

function formatDate(date) {
    return date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-';
}

document.getElementById('exportData').addEventListener('click', exportToExcel);

function exportToExcel() {
    const data = calendarData.sort((a, b) => new Date(a.start) - new Date(b.start)).map((period, index) => ({
        "Start Date": new Date(period.start).toLocaleDateString('en-US'),
        "End Date": new Date(period.end).toLocaleDateString('en-US'),
        "Cycle Day": index + 1
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Cycle Data");
    XLSX.writeFile(workbook, 'cycle_data.xlsx');
}

document.getElementById('clearData').addEventListener('click', () => {
    calendarData = []; 
    saveData(); 
    generateCalendar(currentDate); 
    updatePredictions(); 
});


document.getElementById('prevMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    generateCalendar(currentDate);
    updatePredictions();
});

document.getElementById('nextMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    generateCalendar(currentDate);
    updatePredictions();
});


document.addEventListener('DOMContentLoaded', () => {
    generateCalendar(currentDate);
    updatePredictions();
});
