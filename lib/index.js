import * as d3 from "d3";
import calendar from "./calendar";

d3.json("data/commit_volume.json", (error, commits) => {
  if (error) throw error;

  d3.json("data/developers.json", (error, developers) => {
    if (error) throw error;
    
    d3.json("data/weather.json", (error, weather) => {
      if (error) throw error;
      
      const projectKeys = Object.keys(commits).sort();

        let projectPicker = d3.select("#projectPicker").selectAll(".project-button")
          .data(projectKeys);

        // Add a button to load each project
        projectPicker.enter()
          .append("input")
          .attr("value", projectKey => projectKey)
          .attr("type", "button")
          .attr("class", "project-button")
          .on("click", projectKey => calendar(projectKey, commits[projectKey], developers[projectKey], weather));

          // Show the calendar for the first project
          calendar(projectKeys[0], commits[projectKeys[0]], developers[projectKeys[0]], weather);
    });
  })
});
