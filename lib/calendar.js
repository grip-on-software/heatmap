import * as d3 from "d3";

const calendaryearWidth = 1061, // Width of one calendar year
    svgHeight = 200, // Height of svg
    cellSize = 20; // Size of each day cell

// The color scale used to display the commit size
const color = d3.scaleQuantize()
    .domain([0, 100])
    .range(["#ffffd9","#edf8b1","#c7e9b4","#7fcdbb","#41b6c4","#1d91c0","#225ea8","#253494","#081d58"]);

// Which years to display in this visualization
const years = d3.range(2014, 2018);

// Month localization
const months = ["Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli", "Augustus", "September", "Oktober", "November", "December"];

function calendar(projectKey, json) {
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
    var svg = heatmapDiv.append("svg")
        .attr("width", calendaryearWidth * years.length)
        .attr("height", svgHeight)
        .selectAll("g")
            .data(years)
            .enter();
    
    let baseYearOffset = calendaryearWidth / 2;
    let currentYear = years[0];
    
    svg.append("g")
        .attr("transform", d => {
            if (d != currentYear) {
                baseYearOffset += calendaryearWidth;
                currentYear = d;
            }

            return "translate(" + baseYearOffset + ",20)";
        })
        .selectAll("text")
        .data(d => d3.timeYears(new Date(d, 0, 1), new Date(d + 1, 0, 1)))
        .enter()
        .append("text")
        .attr("class", "year")
        .text(d => d.getFullYear());



    // Offset for new years
    let xOffset = -calendaryearWidth;

    // Create day cells
    var rect = svg.append("g")
        .attr("fill", "none")
        .attr("stroke", "#ccc")
        .attr("transform", function() {
            xOffset += calendaryearWidth;
            return "translate(" + xOffset + ",50)";
        })
        .selectAll("rect")
        .data(d => d3.timeDays(new Date(d, 0, 1), new Date(d + 1, 0, 1))) // Specifies year range
        .enter().append("rect")
            .attr("width", cellSize)
            .attr("height", cellSize)
            .attr("x",d => d3.timeWeek.count(d3.timeYear(d), d) * cellSize)
            .attr("y", d => d.getDay() * cellSize)
            .datum(d3.timeFormat("%Y-%m-%d"));
    
    // Reset offset for month delimiters
    xOffset = -calendaryearWidth;

    // Set dark month delimiters
    svg.append("g")
        .attr("fill", "none")
        .attr("stroke", "#000")
        .attr("transform", function() {
            xOffset += calendaryearWidth;
            return "translate(" + xOffset + ",50)";
        })
        .selectAll("path")
        .data(d => d3.timeMonths(new Date(d, 0, 1), new Date(d + 1, 0, 1)))
        .enter().append("path")
            .attr("d", pathMonth);
    
    // Offset for months
    let baseMonthOffset = 3 * cellSize;
    currentYear = years[0];

    // Add month names above months
    svg.append("g")
        .attr("transform", "translate(0,20)")
        .selectAll("text")
        .data(d => d3.timeMonths(new Date(d, 0, 1), new Date(d + 1, 0, 1)))
        .enter().append("text")
            .text(d => months[d.getMonth()])
            .attr("class", "month")
            .attr("transform", function(d) {
                // Account for the calendars to the left
                if (d.getFullYear() != currentYear) {
                    baseMonthOffset += calendaryearWidth;
                    currentYear = d.getFullYear();
                }

                // Number of sundays that has passed before this month
                const numberOfSundaysBeforeThis = d3.timeWeek.count(d3.timeYear(d), d);

                const offset = baseMonthOffset + (numberOfSundaysBeforeThis * cellSize);

                return "translate(" + offset + ",20)";
            });

    // Format the data
    var data = d3.nest()
        .key(d => d.day )
        .rollup(d => d[0].value)
        .object(json);

    // Color the days which have commits, according to the number of commits
    rect.filter(d => d in data)
        .attr("fill", d => color(data[d]))
        .append("title")
        .text(d => d + ": " + data[d]);

    // Helper function for the month borders
    function pathMonth(t0) {
        var t1 = new Date(t0.getFullYear(), t0.getMonth() + 1, 0),
            d0 = t0.getDay(), w0 = d3.timeWeek.count(d3.timeYear(t0), t0),
            d1 = t1.getDay(), w1 = d3.timeWeek.count(d3.timeYear(t1), t1);
        return "M" + (w0 + 1) * cellSize + "," + d0 * cellSize
            + "H" + w0 * cellSize + "V" + 7 * cellSize
            + "H" + w1 * cellSize + "V" + (d1 + 1) * cellSize
            + "H" + (w1 + 1) * cellSize + "V" + 0
            + "H" + (w0 + 1) * cellSize + "Z";
    }
    
    return;
}

export default calendar;
