import * as d3 from "d3";

const width = 1061, // Width of one calendar year
    height = 150, // Height of svg
    cellSize = 20; // Size of each day cell

// The color scale used to display the commit size
let color = d3.scaleQuantize()
    .domain([0, 100])
    .range(["#ffffd9","#edf8b1","#c7e9b4","#7fcdbb","#41b6c4","#1d91c0","#225ea8","#253494","#081d58"]);

// Which years to display in this visualization
const years = d3.range(2014, 2018);

function calendar(projectKey, json) {
    d3.select(".project")
        .remove() // Remove the current project heatmap
    // The div which will hold the heatmap calendar
    let heatmapDiv = d3.select("#calendar")
        .append("div")
        .attr("class", "project");

    // Show project name
    heatmapDiv.append("h2")
        .text(projectKey);
    
    // Create an SVG which will hold the calendar
    var svg = heatmapDiv.append("svg")
        .attr("width", width * years.length)
        .attr("height", height)
        .selectAll("g")
            .data(years)
            .enter();

    // Offset for new years
    let xOffset = -width;

    // Create day cells
    var rect = svg.append("g")
        .attr("fill", "none")
        .attr("stroke", "#ccc")
        .attr("transform", function() {
            xOffset += width;
            return "translate(" + xOffset + ",0)";
        })
        .selectAll("rect")
        .data(function(d) { return d3.timeDays(new Date(d, 0, 1), new Date(d + 1, 0, 1)); }) // Specifies year range
        .enter().append("rect")
            .attr("width", cellSize)
            .attr("height", cellSize)
            .attr("x", function(d) { return d3.timeWeek.count(d3.timeYear(d), d) * cellSize; })
            .attr("y", function(d) { return d.getDay() * cellSize; })
            .datum(d3.timeFormat("%Y-%m-%d"));
    
    // Reset offset for month delimiters
    xOffset = -width;

    // Set dark month delimiters
    svg.append("g")
        .attr("fill", "none")
        .attr("stroke", "#000")
        .attr("transform", function() {
            xOffset += width;
            return "translate(" + xOffset + ",0)";
        })
        .selectAll("path")
        .data(function(d) { return d3.timeMonths(new Date(d, 0, 1), new Date(d + 1, 0, 1)); })
        .enter().append("path")
            .attr("d", pathMonth);

    // Format the data
    var data = d3.nest()
        .key(function(d) { return d.day; })
        .rollup(function(d) { return d[0].value })
        .object(json);

    // Color the days which have commits, according to the number of commits
    rect.filter(function(d) { return d in data; })
        .attr("fill", function(d) { return color(data[d]); })
        .append("title")
        .text(function(d) { return d + ": " + data[d]; });

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
