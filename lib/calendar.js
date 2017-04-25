import * as d3 from "d3";
import tooltip from "./tooltip";

const defaultConfiguration = {
    key: "Unnamed project",
    mode: "developer",
    showWeather: true,
    elementClass: "project",
    calendaryearWidth: 1061, // Width of one calendar year
    svgHeight: 200, // Height of svg
    cellSize: 20, // Size of each day cell
    colors: ["#f2f0f7", "#dadaeb", "#bcbddc", "#9e9ac8", "#756bb1", "#54278f"],
    domain: [0, 100],
    months: ["Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli", "Augustus", "September", "Oktober", "November", "December"],
}

let config = defaultConfiguration;

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
        if (config.mode === "developer") {
            if ((commitData[date] / developerData[date]) > max) {
                max = (commitData[date] / developerData[date])
            }
        } else {
            if (commitData[date] > max) {
                max = commitData[date];
            }
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

let dayGroups;
let coloredDayCells;
let temperatureBars;

let mode = config.mode;

class calendar {
    // Create a new calendar instance
    constructor(data = {}, configuration = {}) {
        config = Object.assign({}, defaultConfiguration, configuration);

        this.projectKey = config.key;
        this.commits = data.commits;
        this.developers = data.developers;
        this.weather = data.weather;

        this.commitData = d3.nest()
            .key(d => d.day )
            .rollup(d => d[0].value)
            .object(this.commits);
        
        this.developerData = d3.nest()
            .key(d => d.day )
            .rollup(d => d[0].value)
            .object(this.developers);

        this.years = getYearRange(this.commits);

        // Remove the current project heatmap
        d3.select(`.${config.elementClass}`)
            .remove()

        this.createSvg()
            .createYearHeadings()
            .createMonthNames()
            .createDayCells()
            .createMonthDelimiters();
    }

    // Create the SVG element which will hold the calendar
    createSvg() {
        // The div which will hold the heatmap calendar
        let heatmapDiv = d3.select("#calendar")
            .append("div")
            .attr("class", config.elementClass);

        // Show project name
        heatmapDiv.append("h2")
            .text(this.projectKey);
        
        // Create an SVG which will hold the calendar
        this.svg = heatmapDiv.append("svg")
            .attr("width", config.calendaryearWidth * this.years.length)
            .attr("height", config.svgHeight)
            .selectAll("g")
                .data(this.years)
                .enter();
        
        return this;
    }

    createYearHeadings() {
        let baseYearOffset = config.calendaryearWidth / 2;
        let currentYear = this.years[0];
        
        // Year headings
        this.svg.append("g")
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
        
        return this;
    }

        createMonthNames() {
        // Offset for months
        const baseMonthOffset = 3 * config.cellSize;
        // Offset for month names
        let xOffset = -config.calendaryearWidth;
        // The current year
        let currentYear = this.years[0];

        // Add month names above months
        this.svg.append("g")
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

        return this;
    }

    createDayCells() {
        // Offset for new years
        let xOffset = -config.calendaryearWidth;

        // The <g> elements which hold the day cells and temperature barcharts
        dayGroups = this.svg.append("g")
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
            `<strong>${roundToOneDecimal(this.commitData[formatDate(day)] / this.developerData[formatDate(day)])} commits/developer</strong><br>
            ${this.commitData[formatDate(day)]} commits<br>
            ${this.developerData[formatDate(day)]} developers<br>
            ${this.weather[formatDate(day)]} °C`))
            .on('mouseout', tooltip.hide)
            .on('mousemove', () => {
                let event = d3.event;
                requestAnimationFrame(() => tooltip.setLocation(event))
            });

        // Create day cells
        coloredDayCells = dayGroups.append("rect")
            .attr("stroke", "#ccc")        
            .attr("width", config.cellSize)
            .attr("height", config.cellSize)
            .attr("x", d => dayCellXPosition(d))
            .attr("y", d => d.getDay() * config.cellSize)
            .datum(d3.timeFormat("%Y-%m-%d"));
        
        // Dynamically set the domain of the colors
        config.domain = [0, getLargestCommitAmount(this.commitData, this.developerData)];
              
        // Add small temperature bars to each day cell that has commit data
        this.addTemperatureBars();

        // Color the days which have commits, according to the number of commits
        this.setMode("developer");

        return this;
    }

    createMonthDelimiters() {
        // The offset for month delimiters
        let xOffset = -config.calendaryearWidth;

        // Set dark month delimiters
        this.svg.append("g")
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
        
        return this;
    }

    // Add temperature bars to the given day cells
    addTemperatureBars() {
        temperatureBars = dayGroups.append("rect")
            .attr("width", config.cellSize)
            .attr("x", d => dayCellXPosition(d))
            .attr("y", d => (d.getDay() * config.cellSize) + (config.cellSize - barchartHeight(this.weather[formatDate(d)])))
            .datum(d3.timeFormat("%Y-%m-%d"))
            .filter(d => d in this.commitData)
                .attr("class", "temperature-bar")
                .attr("fill", d => this.getColor(d))
                .attr("stroke", "#ccc")
                .attr("height", d => barchartHeight(this.weather[d]));
    }

    // Toggle the display of the temperature bars
    toggleTemperatureBars() {
        if (config.showWeather) {
            config.showWeather = false;

            temperatureBars.remove();
        } else {
            config.showWeather = true;
            this.addTemperatureBars();
        }
    }

    // Set the current view mode to either "commits", showing the color for total commit size,
    // or "developer", showing the color for the commits divided by the number of developers
    setMode(mode = "developer") {      
        config.mode = mode;

        // Change day cell color
        coloredDayCells.filter(d => d in this.commitData)
            .attr("fill", d => this.getColor(d));
        
        // Change temperature fill bar color
        temperatureBars.filter(d => d in this.commitData)
            .attr("fill", d => this.getColor(d));
    }

    getColor(d) {
        // Reset the domain
        config.domain = [0, getLargestCommitAmount(this.commitData, this.developerData)];

        const color = d3.scaleQuantize()
            .domain(config.domain)
            .range(config.colors)

        if (config.mode === "commits") {
            return color(this.commitData[d]);
        }

        return color(this.commitData[d] / this.developerData[d]);
    }
}

export default calendar
