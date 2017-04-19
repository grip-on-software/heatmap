import * as d3 from "d3";
import calendar from "./calendar";

d3.json("data/commit_volume.json", function(error, json) {
  if (error) throw error;

  const projectKeys = Object.keys(json).sort();

  let projectPicker = d3.select("#projectPicker").selectAll(".project-button")
    .data(projectKeys);

  // Add a button to load each project
  projectPicker.enter()
    .append("input")
    .attr("value", projectKey => projectKey)
    .attr("type", "button")
    .attr("class", "project-button")
    .on("click", projectKey => calendar(projectKey, json[projectKey]));

    // Show the calendar for the first project
    calendar(projectKeys[0], json[projectKeys[0]]);
});
