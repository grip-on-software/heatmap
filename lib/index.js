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
      let currentCalendar;

      // Current view options
      let mode = "developer";
      let showWeather = true;

      const dataOptions = ["commits", "developer"];

      // Add buttons for switching between the different data views
      d3.select("#dataPicker").selectAll(".data-button")
        .data(dataOptions).enter()
        .append("input")
        .attr("value", dataOption => dataOption)
        .attr("type", "button")
        .attr("class", "data-button")
        .on("click", dataOption => {
          mode = dataOption;
          currentCalendar.setMode(dataOption);
        });
      
      // Add weather toggle
      d3.select("#dataPicker")
        .append("input")
        .attr("value", "Toggle weather")
        .attr("type", "button")
        .attr("class", "weather-toggle")
        .on("click", d => {
          showWeather = showWeather ? false : true;
          currentCalendar.toggleTemperatureBars();
        });

      const projectKeys = Object.keys(commits.data).sort();

      // Add a button to load each project
      d3.select("#projectPicker").selectAll(".project-button")
        .data(projectKeys).enter()
        .append("input")
        .attr("value", projectKey => projectKey)
        .attr("type", "button")
        .attr("class", "project-button")
        .on("click", projectKey => {
          currentCalendar = new calendar({
            commits: commits.data[projectKey], 
            developers: developers.data[projectKey], 
            weather: weather.data
          }, {
            key: projectKey,
            mode,
            showWeather
          });
        });

        // Show the calendar for the first project
        currentCalendar = new calendar({
          commits: commits.data[projectKeys[0]], 
          developers: developers.data[projectKeys[0]], 
          weather: weather.data
        }, {
          key: projectKeys[0],
          mode,
          showWeather
        });
      
        loadingSpinner.stop();
  }))
  .catch(function (error) {
    console.log(error);
  });
