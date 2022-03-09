/**
 * Week-based calendar strip display.
 */
import _ from "lodash";
import * as d3 from "d3";
import axios from "axios";
import moment from "moment";
import {dataOptions} from './shared';
import tooltip from "./tooltip";
import dragscroll from 'dragscroll';

const defaultConfiguration = {
    key: "N/A",
    metadata: {},
    sources: {},
    mode: dataOptions[0].name,
    showWeather: true,
    elementClass: "project",
    calendaryearWidth: 1061, // Width of one calendar year
    svgHeight: 230, // Height of svg
    cellSize: 20, // Size of each day cell
    colors: ["#f2f0f7", "#dadaeb", "#bcbddc", "#9e9ac8", "#756bb1", "#54278f"],
    domain: [0, 100],
};

function scrollLeftTween(scrollWidth) {
    return function() {
        var node = this;
        var i = d3.interpolateNumber(this.scrollLeft, scrollWidth);
        return function(t) {
            node.scrollLeft = i(t);
        };
    };
}

/**
 * Calendar strip.
 */
class Calendar {
    /**
     * Create a new calendar instance.
     */
    constructor(data = {}, configuration = {}, locales=null) {
        this.config = Object.assign({}, defaultConfiguration, configuration);
        this.locales = locales;

        moment.locale(this.locales.lang);

        this.projectKey = this.config.key;
        this.metadata = this.config.metadata;
        this.sources = this.config.sources;

        this.commits = data.commits;
        this.developers = data.developers;
        this.weather = data.weather;

        // Holds all domains for each year, per mode
        this.maxDomains = _.mapValues(_.zipObject(_.map(dataOptions, "name")),
            () => []
        );

        this.commitData = d3.rollup(this.commits || [], d => d[0].value,
            d => d.day
        );

        this.developerData = d3.rollup(this.developers || [], d => d[0].value,
            d => d.day
        );

        this.filechangesData = new Map();

        // Create an array with all years in the data
        this.years = this.getYearRange();

        // The default date format
        this.dateKey = d3.timeFormat('%Y-%m-%d');

        // The localized date format
        this.formatDate = d3.timeFormat(this.locales.get('date'));

        // Remove the current project heatmap
        d3.select(`.${this.config.elementClass}`)
            .remove();

        // Remove the list of filechanges
        this.filechanges = d3.select('#filechanges');
        this.filechanges.selectAll('div').remove();

        // Create the SVG
        this.createSvg();
        if (this.svg) {
            this.calculateColorDomains()
                .createYearHeadings()
                .createMonthNames()
                .createWeekNames()
                .createDayCells()
                .createMonthDelimiters()
                .createColorLegend();
        }
    }

    /**
     * Create the SVG element which will hold the calendar.
     */
    createSvg() {
        // Show project name
        const element = d3.select("#calendar").append("div")
            .classed(this.config.elementClass, true);
        const title = element.append("h2")
            .classed("subtitle is-4 has-text-centered", true);
        title.append("span")
            .text(this.metadata.quality_display_name || this.metadata.name);
        title.append("a")
            .classed("icon", true)
            .classed("is-hidden", !this.sources.vcs_url)
            .attr("role", "link")
            .attr("aria-label", this.locales.message("repo-link"))
            .attr("href", this.sources.vcs_url)
            .append("i")
            .classed("fas fa-external-link-alt", true);

        // The div which will hold the heatmap calendar
        const heatmapDiv = element.append("div")
            .classed("dragscroll", true);

        // Reset the dragscrolling on the calendar, otherwise it won't work when creating
        // a new calendar after page load
        dragscroll.reset();

        // If there is data to be displayed, create an SVG which will hold the calendar
        if (!_.isEmpty(this.commitData)) {
            this.svg = heatmapDiv.append("svg")
                .attr("width", this.config.calendaryearWidth * this.years.length + this.config.cellSize)
                .attr("height", this.config.svgHeight)
                .selectAll("g")
                    .data(this.years)
                    .enter();

            if (this.years.length > 1) {
                const scrollWidth = heatmapDiv.property("scrollWidth") -
                    heatmapDiv.property("clientWidth");
                heatmapDiv.transition()
                    .duration(3000)
                    .ease(d3.easeSin)
                    .tween("endScroll", scrollLeftTween(scrollWidth));
            }
        } else {
            // Show an error message
            heatmapDiv.append('p')
                .attr('class', 'no-data')
                .text(this.locales.message('no-data'));
        }

        return this;
    }

    /**
     * Create the year headings above each calendar year.
     */
    createYearHeadings() {
        let baseYearOffset = this.config.calendaryearWidth / 2 + this.config.cellSize;
        let currentYear = this.years[0];

        // Year headings
        this.svg.append("g")
            .attr("class", year => `year-heading ${year}`)
            .attr("transform", d => {
                if (d !== currentYear) {
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

    /**
     * Add a color legend to each calendar year strip.
     */
    createColorLegend() {
        let baseYearOffset = this.config.cellSize;
        let currentYear = this.years[0];

        const g = this.svg.append('g')
            .attr('class', year => `legend ${year}`)
            .attr('transform', d => {
                if (d !== currentYear) {
                    baseYearOffset += this.config.calendaryearWidth;
                    currentYear = d;
                }

                return `translate(${baseYearOffset},220)`;
            });

        g.append('text')
            .attr('class', 'max-value')
            .text(d => this.maxDomains[this.config.mode.name][d])
            .style('font-size', '12px')
            .attr('x', 65)
            .attr('y', -2);

        g.selectAll('rect')
            .data(this.config.colors)
            .enter()
            .append('rect')
            .attr('width', 10)
            .attr('height', 10)
            .attr('x', (d, i) => {
                return i * 10;
            })
            .attr('y', -12)
            .attr('fill', d => d);

        return this;
    }

    /**
     * Add month names above each month.
     */
    createMonthNames() {
        // Offset for months
        const baseMonthOffset = 3 * this.config.cellSize;
        // Offset for month names
        let xOffset = -this.config.calendaryearWidth + this.config.cellSize;

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
                .text(d => this.locales.attribute("months", d.getMonth()))
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

    /**
     * Add weekday names next to each week day row.
     */
    createWeekNames() {
        // The offset for weekday delimiters
        let xOffset = -this.config.calendaryearWidth + this.config.cellSize;
        // The first year
        const firstYear = this.years[0];

        // Add weekday names next to the weekdays
        this.svg.append("g")
            .attr("class", year => `weekday-names ${year}`)
            .attr("transform", d => {
                xOffset += this.config.calendaryearWidth;
                return `translate(${xOffset},50)`;
            })
            .selectAll("text")
            .data(d => d3.timeDays(new Date(d, 0, 1), new Date(d, 0, 8)))
            .enter().append("text")
                .text(d => this.locales.attribute("shortDays", d.getDay()))
                .attr("class", "weekday-heading")
                .classed("is-hidden", d => d.getDay()+1 === d.getDate() && d.getFullYear() !== firstYear)
                .attr("transform", d => {
                    return `translate(${(d.getDay()+1 >= d.getDate() ?
                        -this.config.cellSize : 0
                    ) + 0.5 * this.config.cellSize}, ${d.getDay() *
                        this.config.cellSize + 0.75 * this.config.cellSize
                    })`;
                });

        return this;
    }

    /**
     * Create all day cells, with data and tooltip.
     */
    createDayCells() {
        // Offset for new years
        let xOffset = -this.config.calendaryearWidth + this.config.cellSize;

        // The <g> elements which hold the day cells and temperature barcharts
        this.dayGroups = this.svg.append("g")
            .attr("class", year => `days ${year}`)
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
        this.dayGroups
            .attr('tabindex', '0')
            .on('mouseover focus', (event, day) => this.showTooltip(event, day))
            .on('mouseout blur', tooltip.hide)
            .on('mousemove', (event) => {
                requestAnimationFrame(() => tooltip.setLocation(event));
            });

        // Show the files that were changed on this date after a long time
        this.dayGroups.on('click', day => {
            this.clickDay(day);
        });

        // Create day cells
        this.coloredDayCells = this.dayGroups.append("rect")
            .attr("stroke", "#ccc")
            .attr("width", this.config.cellSize)
            .attr("height", this.config.cellSize)
            .attr("x", d => this.dayCellXPosition(d))
            .attr("y", d => d.getDay() * this.config.cellSize)
            .datum(d3.timeFormat("%Y-%m-%d"));

        // Add small temperature bars to each day cell that has commit data
        if (this.config.showWeather) {
            this.addTemperatureBars();
        }

        // Color the days which have commits, according to the number of commits
        this.setMode(this.config.mode);

        return this;
    }

    /**
     * Create the darker month delimiters.
     */
    createMonthDelimiters() {
        // The offset for month delimiters
        let xOffset = -this.config.calendaryearWidth + this.config.cellSize;

        // Helper function to create the month borders
        const pathMonth = (t0) => {
            const t1 = new Date(t0.getFullYear(), t0.getMonth() + 1, 0),
                d0 = t0.getDay(), w0 = d3.timeWeek.count(d3.timeYear(t0), t0),
                d1 = t1.getDay(), w1 = d3.timeWeek.count(d3.timeYear(t1), t1);
            const m1 = (w0 + 1) * this.config.cellSize;
            return `M${m1},${d0 * this.config.cellSize}\
H${w0 * this.config.cellSize}V${7 * this.config.cellSize}\
H${w1 * this.config.cellSize}V${(d1 + 1) * this.config.cellSize}\
H${(w1 + 1) * this.config.cellSize}V0H${m1}Z`;
        };

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

    /**
     * Add temperature bars to all day cells that have data.
     */
    addTemperatureBars() {
        // Get the height of the temperature barchart
        const barchartHeight = d3.scaleQuantize()
                .domain([0, 25])
                .range(d3.range(0, this.config.cellSize));

        // Add the bar charts
        this.temperatureBars = this.dayGroups
            .filter(d => this.commitData.has(this.dateKey(d)) && _.has(this.weather, this.dateKey(d)))
            .append("rect")
            .attr("width", this.config.cellSize)
            .attr("x", d => this.dayCellXPosition(d))
            .attr("y", d => (d.getDay() * this.config.cellSize) + (this.config.cellSize - barchartHeight(this.weather[this.dateKey(d)])))
            .datum(d3.timeFormat("%Y-%m-%d"))
            .attr("class", "temperature-bar")
            .attr("fill", d => this.getColor(d))
            .attr("stroke", "#ccc")
            .attr("height", d => barchartHeight(this.weather[d]));
    }

    /**
     * Toggle the display of the temperature bars.
     */
    toggleTemperatureBars() {
        if (this.config.showWeather) {
            this.config.showWeather = false;
            this.temperatureBars.remove();
        } else {
            this.config.showWeather = true;
            this.addTemperatureBars();
        }
    }

    /**
     * Handle a click event on a day cell to show more details regarding file
     * changes on that date.
     */
    clickDay(day) {
        if (this.config.mode.filechanges) {
            const filechanges = this.filechangesData[this.dateKey(day)];

            // Remove the previously shown filechanges
            this.filechanges.selectAll('div').remove();

            // Show the current date as a heading
            const laterDate = filechanges[_.keys(filechanges)[0]][0].later_date;
            this.filechanges.append('div')
                .attr('class', 'file-change-header')
                .text(this.locales.message("file-change-header", [
                    moment(laterDate).format('LL'),
                    filechanges.length,
                    this.config.key
                ]));

            // Show changes for each repo
            showRepoChanges(filechanges);
        }
    }

    /**
     * Show changes for all repositories on a certain date.
     */
    showRepoChanges(filechanges) {
        // If this is the only repo, always show all file changes
        const onlyOneRepo = _.size(filechanges) === 1;
        // Index to add to the repo classname
        let index = 0;

        _.forIn(filechanges, (repoData, repo) => {
            if (repo !== 'length') {
                const repoDiv = this.filechanges.append('div')
                    .attr('class', `repo repo-${index}`);

                const repoHeader = repoDiv.append('p')
                    .attr('class', 'file-change-repo')
                    .text(`${repo} (${repoData.length})`);
                if (repoData[0].url != null) {
                    repoHeader.append('a')
                        .classed("icon", true)
                        .classed("is-hidden", !repoData[0].url)
                        .attr('href', repoData[0].url)
                        .attr('role', 'link')
                        .attr('aria-label', this.locales.message('repo-link'))
                        .on('click', (event) => { event.stopPropagation(); })
                        .append("i")
                        .classed("fas fa-external-link-alt", true);
                }

                // Add an accordion to the repo headers
                let collapsed = true;

                if (onlyOneRepo || (filechanges.length <= 10)) {
                    collapsed = false;
                }

                const repoNumber = index;

                repoHeader.on('click', () => {
                    if (collapsed) {
                        d3.selectAll(`.repo-${repoNumber} .file-change`).attr('style', null);
                        collapsed = false;
                    } else {
                        d3.selectAll(`.repo-${repoNumber} .file-change`).attr('style', 'display: none');
                        collapsed = true;
                    }
                });

                // Show the names and the date for each change on this date
                repoDiv.selectAll('p.file-change').data(filechanges[repo]).enter()
                    .append('p')
                    .attr('class', 'file-change')
                    .attr('style', () => {
                        if (!onlyOneRepo && (filechanges.length > 10)) {
                            return 'display: none';
                        }

                        return '';
                    })
                    .text(d => {
                        const laterDate = moment(d.later_date);
                        const earlierDate = moment(d.earlier_date);

                        return this.locales.message("file-change", [d.file, laterDate.diff(earlierDate, 'days')]);
                    });

                index++;
            }
        });
    }

    /**
     * Handle a hover event by showing a tooltip with statistics for the given
     * day corresponding to a day cell.
     */
    showTooltip(event, day) {
        const date = this.dateKey(day);
        if (!this.commitData.has(date)) {
            return;
        }
        const data = {
            commit: this.commitData.get(date),
            developer: this.developerData.get(date),
            filechanges: this.filechangesData ?
                this.filechangesData.get(date) : []
        };

        let message = this.config.mode.tooltip(data, this.locales);

        if (this.config.mode.temperature && this.weather[date] !== undefined) {
            message += `${this.locales.message("temperature-unit", [
                this.weather[date]
            ])}<br>`;
        }

        tooltip.show(event, moment(day).format('LL'), message);
    }

    /**
     * Set the current view mode to one of the following modes:
     * - "total-commits", showing the color for total commit size;
     * - "commits-per-developer", showing the color for the commits divided by
     *   the number of developers;
     * - "file-changes", which changes the data to files which are changed
     *   after a long time.
     */
    setMode(mode) {
        this.config.mode = mode;
        if (!this.svg) {
            return;
        }

        const changeData = (data) => {
            this.setMaxDomains(this.config.mode);

            // Update the max domain on the legend
            d3.selectAll('.legend .max-value')
                .text(d => this.maxDomains[this.config.mode.name][d]);

            // Change day cell color
            this.coloredDayCells.filter(d => data.has(d))
                .attr("fill", d => this.getColor(d))
                .transition().duration(1000)
                .style("fill", d => this.getColor(d));

            // Change temperature fill bar color, if they are displayed
            if (this.temperatureBars && this.config.mode.temperature) {
                this.temperatureBars.filter(d => data.has(d))
                    .attr("fill", d => this.getColor(d));
            }
        };

        if (this.config.mode.filechanges) {
            axios.get(`data/long_waiting_commits/${this.config.key}.json`)
                .then((response) => {
                    this.filechangesData = d3.rollup(response.data, d => d,
                        d => this.formatDate(new Date(d.later_date)),
                        d => d.repo_name
                    );

                    // Add a 'length' property to each date which holds the total number of changes
                    this.filechangesData.forEach(d => {
                        d.length = _.sum(_.map(d, i => i.length));
                    });

                    // Empty out the current cells because the file data has a different domain
                    this.coloredDayCells.filter(d => this.commitData.has(d))
                        .attr("fill", null)
                        .attr("style", null);

                    changeData(this.filechangesData);
                })
                .catch(error => { throw error; });
        } else {
            // Remove the list of filechanges
            this.filechanges.selectAll('div').remove();

            changeData(this.commitData);
        }
    }

    /**
     * Calculate the maximum values for each data mode.
     */
    calculateColorDomains() {
        dataOptions.forEach(mode => {
            this.setMaxDomains(mode);
        });

        return this;
    }

    /**
     * Calculate the maximum value for each year for the data corresponding to
     * the given mode.
     */
    setMaxDomains(mode) {
        this.years.forEach(year => {
            this.maxDomains[mode.name][year] = this.maxDomain(mode.name, year);
        });
    }

    /**
     * Get the color of the value for the given date.
     */
    getColor(d) {
        const year = new Date(d).getFullYear();

        this.config.domain = [0, this.maxDomains[this.config.mode.name][year]];

        const color = d3.scaleQuantize()
            .domain(this.config.domain)
            .range(this.config.colors);

        const data = {
            commit: this.commitData.get(d),
            developer: this.developerData.get(d),
            filechanges: this.filechangesData ? this.filechangesData.get(d) : []
        };

        return color(this.config.mode.color(data));
    }

    /**
     * Calculate the domain of the color function for the given year.
     */
    maxDomain(mode, year) {
        let max = 0;

        if (mode !== "file-changes") {
            this.commitData.forEach((commits, date) => {
                if (new Date(date).getFullYear() === year) {
                    max = Math.max(max,
                        mode === "commits-per-developer" && this.developerData.get(date) ?
                        (commits / this.developerData.get(date)) :
                        commits
                    );
                }
            });
        } else {
            this.filechangesData.forEach((changes, date) => {
                if (new Date(date).getFullYear() === year) {
                    max = Math.max(max, changes.length);
                }
            });

            max = Math.min(max, 100);
        }

        return max;
    }

    /**
     * Get a sorted array of all years that are in the commit data.
     */
    getYearRange() {
        const years = [];

        this.commits.forEach(d => {
            const newYear = new Date(d.day).getFullYear();

            if (years.indexOf(newYear) < 0) {
                years.push(newYear);
            }
        });

        return years.sort();
    }

    /**
     * Compute the X position for a day cell.
     */
    dayCellXPosition(d) {
        return d3.timeWeek.count(d3.timeYear(d), d) * this.config.cellSize;
    }
}

export default Calendar;
