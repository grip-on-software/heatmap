import * as d3 from 'd3';
import axios from 'axios';
import calendar from './calendar';
import spinner from './spinner';

const loadingSpinner = new spinner({
    width: d3.select('#calendar').node().clientWidth,
    height: 100,
    startAngle: 220,
    container: '#calendar',
    id: 'loading-spinner'
});

loadingSpinner.start();

axios.all([axios.get('data/commit_volume.json'), axios.get('data/developers.json'), axios.get('data/weather.json')])
  .then(axios.spread(function(commits, developers, weather) {
      const projectKeys = Object.keys(commits.data).sort();

      let projectPicker = d3.select("#projectPicker").selectAll(".project-button")
        .data(projectKeys);

      // Add a button to load each project
      projectPicker.enter()
        .append("input")
        .attr("value", projectKey => projectKey)
        .attr("type", "button")
        .attr("class", "project-button")
        .on("click", projectKey => calendar(projectKey, commits.data[projectKey], developers.data[projectKey], weather.data));

        // Show the calendar for the first project
        calendar(projectKeys[0], commits.data[projectKeys[0]], developers.data[projectKeys[0]], weather.data);
      
        loadingSpinner.stop();
  }))
  .catch(function (error) {
    console.log(error);
  });
