import * as d3 from "d3";
import tooltip from "./tooltip";

const defaultConfiguration = {
    key: "Unnamed project",
    mode: "commits-per-developer",
    showWeather: true,
    elementClass: "project",
    calendaryearWidth: 1061, // Width of one calendar year
    svgHeight: 200, // Height of svg
    cellSize: 20, // Size of each day cell
    colors: ["#f2f0f7", "#dadaeb", "#bcbddc", "#9e9ac8", "#756bb1", "#54278f"],
    domain: [0, 100],
    months: ["Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli", "Augustus", "September", "Oktober", "November", "December"],
}

class calendar {
    // Create a new calendar instance
    constructor(data = {}, configuration = {}) {
        this.config = Object.assign({}, defaultConfiguration, configuration);

        this.projectKey = this.config.key;
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

        // Create an array with all years in the data
        this.years = this.getYearRange();

        // The default date format
        this.formatDate = d3.timeFormat("%Y-%m-%d");

        // Remove the current project heatmap
        d3.select(`.${this.config.elementClass}`)
            .remove()

        // Create the SVG
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
            .attr("class", this.config.elementClass);

        // Show project name
        heatmapDiv.append("h2")
            .text(this.projectKey);
        
        // Create an SVG which will hold the calendar
        this.svg = heatmapDiv.append("svg")
            .attr("width", this.config.calendaryearWidth * this.years.length)
            .attr("height", this.config.svgHeight)
            .selectAll("g")
                .data(this.years)
                .enter();
        
        return this;
    }

    // Create the year headings above each calendar year
    createYearHeadings() {
        let baseYearOffset = this.config.calendaryearWidth / 2;
        let currentYear = this.years[0];
        
        // Year headings
        this.svg.append("g")
            .attr("class", year => `year-heading  ${year}`)
            .attr("transform", d => {
                if (d != currentYear) {
                    baseYearOffset += this.config.calendaryearWidth;
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

    // Add month names above each month
    createMonthNames() {
        // Offset for months
        const baseMonthOffset = 3 * this.config.cellSize;
        // Offset for month names
        let xOffset = -this.config.calendaryearWidth;
        // The current year
        let currentYear = this.years[0];

        // Add month names above months
        this.svg.append("g")
            .attr("class", year => `month-names ${year}`)
            .attr("transform", d => {
                xOffset += this.config.calendaryearWidth;
                return `translate(${xOffset},20)`;
            })
            .selectAll("text")
            .data(d => d3.timeMonths(new Date(d, 0, 1), new Date(d + 1, 0, 1)))
            .enter().append("text")
                .text(d => this.config.months[d.getMonth()])
                .attr("class", "month-heading")
                .attr("transform", d => {
                    // Number of sundays that have passed before this month
                    const numberOfSundaysBeforeThis = d3.timeWeek.count(d3.timeYear(d), d);

                    // The total offset for the month name
                    const offset = baseMonthOffset + (numberOfSundaysBeforeThis * this.config.cellSize);

                    return `translate(${offset},20)`;
                });

        return this;
    }

    // Create all day cells, with data and tooltip
    createDayCells() {
        // Round the given number to at most one decimal
        const roundToOneDecimal = function(number) {
            return Math.round(number * 10) / 10;
        }

        // Offset for new years
        let xOffset = -this.config.calendaryearWidth;

        // The <g> elements which hold the day cells and temperature barcharts
        this.dayGroups = this.svg.append("g")
            .attr("class", year => "days " + year)
            .attr("fill", "none")
            .attr("transform", () => {
                xOffset += this.config.calendaryearWidth;
                return `translate(${xOffset},50)`;
            })
            .selectAll("g")
            .data(d => d3.timeDays(new Date(d, 0, 1), new Date(d + 1, 0, 1))) // Specifies year range
            .enter()
            .append("g")
            .attr("class", "day-group");
        
        // Display a tooltip with information when the user hovers over it
        this.dayGroups.on('mouseover', day => tooltip.show(this.formatDate(day), 
            `<strong>${roundToOneDecimal(this.commitData[this.formatDate(day)] / this.developerData[this.formatDate(day)])} commits/developer</strong><br>
            ${this.commitData[this.formatDate(day)]} commits<br>
            ${this.developerData[this.formatDate(day)]} developers<br>
            ${this.weather[this.formatDate(day)]} °C`))
            .on('mouseout', tooltip.hide)
            .on('mousemove', () => {
                let event = d3.event;
                requestAnimationFrame(() => tooltip.setLocation(event))
            });

        // Create day cells
        this.coloredDayCells = this.dayGroups.append("rect")
            .attr("stroke", "#ccc")        
            .attr("width", this.config.cellSize)
            .attr("height", this.config.cellSize)
            .attr("x", d => this.dayCellXPosition(d))
            .attr("y", d => d.getDay() * this.config.cellSize)
            .datum(d3.timeFormat("%Y-%m-%d"));
        
        // Dynamically set the domain of the colors
        this.resetDomain();
              
        // Add small temperature bars to each day cell that has commit data
        if (this.config.showWeather) {
            this.addTemperatureBars();
        }

        // Color the days which have commits, according to the number of commits
        this.setMode(this.config.mode);

        return this;
    }

    // Create the darker month delimiters
    createMonthDelimiters() {
        // The offset for month delimiters
        let xOffset = -this.config.calendaryearWidth;

        // Helper function to create the month borders
        const pathMonth = (t0) => {
            let t1 = new Date(t0.getFullYear(), t0.getMonth() + 1, 0),
                d0 = t0.getDay(), w0 = d3.timeWeek.count(d3.timeYear(t0), t0),
                d1 = t1.getDay(), w1 = d3.timeWeek.count(d3.timeYear(t1), t1);
            return "M" + (w0 + 1) * this.config.cellSize + "," + d0 * this.config.cellSize
                + "H" + w0 * this.config.cellSize + "V" + 7 * this.config.cellSize
                + "H" + w1 * this.config.cellSize + "V" + (d1 + 1) * this.config.cellSize
                + "H" + (w1 + 1) * this.config.cellSize + "V" + 0
                + "H" + (w0 + 1) * this.config.cellSize + "Z";
        }

        // Set dark month delimiters
        this.svg.append("g")
            .attr("class", year => `month-delimiters ${year}`)
            .attr("fill", "none")
            .attr("stroke", "#000")
            .attr("transform", () => {
                xOffset += this.config.calendaryearWidth;
                return `translate(${xOffset},50)`;
            })
            .selectAll("path")
            .data(d => d3.timeMonths(new Date(d, 0, 1), new Date(d + 1, 0, 1)))
            .enter().append("path")
                .attr("d", pathMonth);
        
        return this;
    }

    // Add temperature bars to all day cells that have data
    addTemperatureBars() {
        // Get the height of the temperature barchart
        const barchartHeight = d3.scaleQuantize()
                .domain([0, 25])
                .range(d3.range(0, this.config.cellSize));

        this.temperatureBars = this.dayGroups.append("rect")
            .attr("width", this.config.cellSize)
            .attr("x", d => this.dayCellXPosition(d))
            .attr("y", d => (d.getDay() * this.config.cellSize) + (this.config.cellSize - barchartHeight(this.weather[this.formatDate(d)])))
            .datum(d3.timeFormat("%Y-%m-%d"))
            .filter(d => d in this.commitData)
                .attr("class", "temperature-bar")
                .attr("fill", d => this.getColor(d))
                .attr("stroke", "#ccc")
                .attr("height", d => barchartHeight(this.weather[d]));
    }

    // Toggle the display of the temperature bars
    toggleTemperatureBars() {
        if (this.config.showWeather) {
            this.config.showWeather = false;
            this.temperatureBars.remove();
        } else {
            this.config.showWeather = true;
            this.addTemperatureBars();
        }
    }

    // Set the current view mode to either "total-commits", showing the color for total commit size,
    // or "commits-per-developer", showing the color for the commits divided by the number of developers
    setMode(mode = "commits-per-developer") {      
        this.config.mode = mode;

        // Change day cell color
        this.coloredDayCells.filter(d => d in this.commitData)
            .attr("fill", d => this.getColor(d))
            .transition().duration(1000)
              .style("fill", d => this.getColor(d));
        
        // Change temperature fill bar color, if they are displayed
        if (this.temperatureBars) {
            this.temperatureBars.filter(d => d in this.commitData)
                .attr("fill", d => this.getColor(d));
        }
    }

    // Get the color for the given date
    getColor(d) {
        // Reset the domain
        this.resetDomain();

        const color = d3.scaleQuantize()
            .domain(this.config.domain)
            .range(this.config.colors)

        if (this.config.mode === "total-commits") {
            return color(this.commitData[d]);
        }

        return color(this.commitData[d] / this.developerData[d]);
    }

    // Set the domain of the color function
    resetDomain() {
        let max = 0;

        for (let date in this.commitData) {
            if (this.config.mode === "commits-per-developer") {
                if ((this.commitData[date] / this.developerData[date]) > max) {
                    max = (this.commitData[date] / this.developerData[date])
                }
            } else {
                if (this.commitData[date] > max) {
                    max = this.commitData[date];
                }
            }
        }

        this.config.domain = [0, max];
    }

    // Get a sorted array of all years that are in the commit data
    getYearRange() {
        let years = [];

        d3.map(this.commits).each(d => {
            const newYear = new Date(d.day).getFullYear();

            if (years.indexOf(newYear) < 0) {
                years.push(newYear);
            }
        });

        return years.sort();
    }

    // Compute the X position for a day cell
    dayCellXPosition(d) {
        return d3.timeWeek.count(d3.timeYear(d), d) * this.config.cellSize;
    }
}

export default calendar
