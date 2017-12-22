import * as d3 from 'd3';
import axios from 'axios';
import calendar from './calendar';
import {navigation, spinner} from '@gros/visualization-ui';
import naturalSort from 'javascript-natural-sort';

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
        const dataOptions = {
            "total-commits": {
                "title": "Totaal commits",
                "description": "Een heatmap van het totaal aantal commits over tijd, zoals bij GitLab of GitHub" 
            },
            "commits-per-developer": {
                "title": "Commits per developer",
                "description": "Een heatmap van het aantal commits, gedeeld door het aantal developers van die dag." 
            },
            "file-changes": {
                "title": "Bestandswijzigingen",
                "description": "Een heatmap van het aantal bestanden die na meer dan een maand weer gewijzigd zijn."
            }
        };
        const dataOptionKeys = Object.keys(dataOptions);

        // Current view settings
        let mode = dataOptionKeys[0];
        let showWeather = false;

        // ALl project names
        const projectKeys = Object.keys(commits.data).sort(naturalSort);

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

        // Add navigation for switching between the different data views
        const dataNavigation = new navigation({
            container: '#dataPicker',
            prefix: 'mode_',
            setCurrentItem: (dataOption, hasDataOption) => {
                if (!hasDataOption) {
                    return false;
                }
                if (dataOption === 'file-changes') {
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
                return true;
            },
            addElement: (element) => {
                element.text(d => dataOptions[d].title)
                    .attr('title', d => dataOptions[d].description);
            }
        });

        // Add navigation to load each project
        const projectsNavigation = new navigation({
            container: '#projectPicker',
            prefix: 'project_',
            setCurrentItem: (projectKey, hasProject) => {
                if (!hasProject) {
                    return false;
                }

                currentCalendar = new calendar({
                    commits: commits.data[projectKey], 
                    developers: developers.data[projectKey], 
                    weather: weather.data
                }, {
                    key: projectKey,
                    mode,
                    showWeather
                });

                return true;
            }
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

        projectsNavigation.start(projectKeys);
        dataNavigation.start(dataOptionKeys);

        loadingSpinner.stop();
    }))
    .catch(function (error) {
        console.log(error);
    });
