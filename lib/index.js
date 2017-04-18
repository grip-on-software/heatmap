import * as d3 from "d3";
import calendar from "./calendar";

d3.json("data/commit_volume.json", function(error, json) {
  if (error) throw error;

  for (var project in json) {
    calendar(project, json[project]);
  }
});
