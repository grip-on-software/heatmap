import * as d3 from "d3";
import tooltip from "./tooltip";
import config from "./config";

// Helper function to get a color within the domain
const color = d3.scaleQuantize()
        .domain(config.domain)
        .range(config.colors);

// Get the height of the temperature barchart
const barchartHeight = d3.scaleQuantize()
        .domain([0, 25])
        .range(d3.range(0, config.cellSize))

// The default date format
const formatDate = d3.timeFormat("%Y-%m-%d");

// Round the given number to at most one decimal
const roundToOneDecimal = function(number) {
    return Math.round(number * 10) / 10;
}

// Compute the X position for a day cell
const dayCellXPosition = function(d) {
    return d3.timeWeek.count(d3.timeYear(d), d) * config.cellSize;
}

// The largest number of commits in the given data
const getLargestCommitAmount = function(commitData, developerData) {
    let max = 0;

    for (let date in commitData) {
        if ((commitData[date] / developerData[date]) > max) {
            max = (commitData[date] / developerData[date])
        }
    }

    return max;
}

// Helper function to create the month borders
function pathMonth(t0) {
    let t1 = new Date(t0.getFullYear(), t0.getMonth() + 1, 0),
        d0 = t0.getDay(), w0 = d3.timeWeek.count(d3.timeYear(t0), t0),
        d1 = t1.getDay(), w1 = d3.timeWeek.count(d3.timeYear(t1), t1);
    return "M" + (w0 + 1) * config.cellSize + "," + d0 * config.cellSize
        + "H" + w0 * config.cellSize + "V" + 7 * config.cellSize
        + "H" + w1 * config.cellSize + "V" + (d1 + 1) * config.cellSize
        + "H" + (w1 + 1) * config.cellSize + "V" + 0
        + "H" + (w0 + 1) * config.cellSize + "Z";
}

// Simple function which returns a sorted array of all years that are in the given data
const getYearRange = function (json) {
    let years = [];
    for (let item in json) {
        const newYear = new Date(json[item].day).getFullYear();

        if (years.indexOf(newYear) < 0) {
            years.push(newYear);
        }
    }
    
    return years.sort();
}

function calendar(projectKey = "", commits = [], developers = [], weather = []) {
    const years = getYearRange(commits);

    // Remove the current project heatmap
    d3.select(".project")
        .remove()

    // The div which will hold the heatmap calendar
    let heatmapDiv = d3.select("#calendar")
        .append("div")
        .attr("class", "project");

    // Show project name
    heatmapDiv.append("h2")
        .text(projectKey);
    
    // Create an SVG which will hold the calendar
    let svg = heatmapDiv.append("svg")
        .attr("width", config.calendaryearWidth * years.length)
        .attr("height", config.svgHeight)
        .selectAll("g")
            .data(years)
            .enter();
    
    let baseYearOffset = config.calendaryearWidth / 2;
    let currentYear = years[0];
    
    svg.append("g")
        .attr("class", year => `year-heading  ${year}`)
        .attr("transform", d => {
            if (d != currentYear) {
                baseYearOffset += config.calendaryearWidth;
                currentYear = d;
            }

            return `translate(${baseYearOffset},20)`;
        })
        .selectAll("text")
        .data(d => d3.timeYears(new Date(d, 0, 1), new Date(d + 1, 0, 1)))
        .enter()
        .append("text")
        .text(d => d.getFullYear());

    // Offset for new years
    let xOffset = -config.calendaryearWidth;

    // The <g> elements which hold the day cells and temperature barcharts
    let dayGroups = svg.append("g")
        .attr("class", year => "days " + year)
        .attr("fill", "none")
        .attr("transform", function() {
            xOffset += config.calendaryearWidth;
            return `translate(${xOffset},50)`;
        })
        .selectAll("g")
        .data(d => d3.timeDays(new Date(d, 0, 1), new Date(d + 1, 0, 1))) // Specifies year range
        .enter()
        .append("g")
        .attr("class", "day-group");
    
    // Display a tooltip with information when the user hovers over it
    dayGroups.on('mouseover', day => tooltip.show(formatDate(day), 
        `<strong>${roundToOneDecimal(commitData[formatDate(day)] / developerData[formatDate(day)])} commits/developer</strong><br>
        ${commitData[formatDate(day)]} commits<br>
        ${developerData[formatDate(day)]} developers<br>
        ${weather[formatDate(day)]} °C`))
        .on('mouseout', tooltip.hide)
        .on('mousemove', () => {
            let event = d3.event;
            requestAnimationFrame(() => tooltip.setLocation(event))
        });

    // Create day cells
    let coloredDayCells = dayGroups.append("rect")
        .attr("stroke", "#ccc")        
        .attr("width", config.cellSize)
        .attr("height", config.cellSize)
        .attr("x", d => dayCellXPosition(d))
        .attr("y", d => d.getDay() * config.cellSize)
        .datum(d3.timeFormat("%Y-%m-%d"));
    
    // Create temperature bars
    let temperatureBars = dayGroups.append("rect")
        .attr("width", config.cellSize)
        .attr("x", d => dayCellXPosition(d))
        .attr("y", d => (d.getDay() * config.cellSize) + (config.cellSize - barchartHeight(weather[formatDate(d)])))
        .datum(d3.timeFormat("%Y-%m-%d"));
    
    // Reset offset for month delimiters
    xOffset = -config.calendaryearWidth;

    // Set dark month delimiters
    svg.append("g")
        .attr("class", year => `month-delimiters ${year}`)
        .attr("fill", "none")
        .attr("stroke", "#000")
        .attr("transform", function() {
            xOffset += config.calendaryearWidth;
            return `translate(${xOffset},50)`;
        })
        .selectAll("path")
        .data(d => d3.timeMonths(new Date(d, 0, 1), new Date(d + 1, 0, 1)))
        .enter().append("path")
            .attr("d", pathMonth);
    
    // Offset for months
    const baseMonthOffset = 3 * config.cellSize;
    // Reset offset for month names
    xOffset = -config.calendaryearWidth;
    // Reset current year to the first year
    currentYear = years[0];

    // Add month names above months
    svg.append("g")
        .attr("class", year => `month-names ${year}`)
        .attr("transform", d => {
            xOffset += config.calendaryearWidth;
            return `translate(${xOffset},20)`;
        })
        .selectAll("text")
        .data(d => d3.timeMonths(new Date(d, 0, 1), new Date(d + 1, 0, 1)))
        .enter().append("text")
            .text(d => config.months[d.getMonth()])
            .attr("class", "month-heading")
            .attr("transform", d => {
                // Number of sundays that have passed before this month
                const numberOfSundaysBeforeThis = d3.timeWeek.count(d3.timeYear(d), d);

                // The total offset for the month name
                const offset = baseMonthOffset + (numberOfSundaysBeforeThis * config.cellSize);

                return `translate(${offset},20)`;
            });

    // Format the data
    let commitData = d3.nest()
        .key(d => d.day )
        .rollup(d => d[0].value)
        .object(commits);
    
    let developerData = d3.nest()
        .key(d => d.day )
        .rollup(d => d[0].value)
        .object(developers);
    
    config.domain = [0, getLargestCommitAmount(commitData, developerData)];

    // Color the days which have commits, according to the number of commits
    coloredDayCells.filter(d => d in commitData)
        .attr("fill", d => color(commitData[d] / developerData[d]));

    // Add a temperature bar for dates that have commit data
    temperatureBars.filter(d => d in commitData)
        .attr("class", "temperature-bar")
        .attr("fill", d => color(commitData[d] / developerData[d]))
        .attr("stroke", "#ccc")
        .attr("height", d => barchartHeight(weather[d]));
    
    return;
}

export default calendar;
