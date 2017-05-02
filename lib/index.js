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

      // All possible view options
      const dataOptions = ["total-commits", "commits-per-developer", "file-changes"];
      
      // Current view settings
      let mode = dataOptions[0];
      let showWeather = false;

      // ALl project names
      const projectKeys = Object.keys(commits.data).sort();      

      // Add weather toggle
      let weatherToggle = d3.select("#weatherToggle")
        .append("input")
        .attr("value", "Temperatuur")
        .attr("type", "button")
        .attr("class", "data-button")
        .classed("active", () => showWeather ? true : false)
        .on("click", (d, element, buttons) => {
          showWeather = showWeather ? false : true;
          d3.select(buttons[element]).classed('active', showWeather);          
          currentCalendar.toggleTemperatureBars();
        });

      // Add buttons for switching between the different data views
      d3.select("#dataPicker").selectAll(".data-button")
        .data(dataOptions).enter()
        .append("input")
        .attr("value", dataOption => dataOption)
        .attr("type", "button")
        .attr("class", "data-button")
        .classed("active", d => d === mode ? true : false)
        .on("click", (dataOption, element, buttons) => {
          d3.select(".data-button.active").classed('active', false);
          d3.select(buttons[element]).classed('active', true);

          mode = dataOption;

          if (mode === 'file-changes') {
              weatherToggle.attr("disabled", true);
              
              // Don't show the temperature bars for the file-changes data
              if (showWeather) {
                  showWeather = false;
                  d3.select("#weatherToggle .data-button.active").classed('active', false);
                  currentCalendar.toggleTemperatureBars();
              }
          } else {
            weatherToggle.attr("disabled", null);
          }

          currentCalendar.setMode(dataOption);
        });

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
