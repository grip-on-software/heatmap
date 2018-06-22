import _ from 'lodash';
import * as d3 from 'd3';
import axios from 'axios';
import calendar from './calendar';
import spec from './locales.json';
import config from 'config.json';
import {locale, navigation, navbar, spinner} from '@gros/visualization-ui';

const locales = new locale(spec);
const searchParams = new URLSearchParams(window.location.search);
locales.select(searchParams.get("lang"));

const loadingSpinner = new spinner({
    width: d3.select('#calendar').node().clientWidth,
    height: 100,
    startAngle: 220,
    container: '#calendar',
    id: 'loading-spinner'
});

loadingSpinner.start();

const buildProjectFilter = function(projectsNavigation, projectData, metadata) {
    const filter = (projectData) => {
        const filters = {};
        d3.selectAll('#projectFilter input').each(function(d) {
            const checked = d3.select(this).property('checked');
            const bits = d.inverse ? [d.inverse, !checked] : [d.key, checked];
            if (bits[1]) {
                filters[bits[0]] = true;
            }
        });

        return _.filter(projectData, filters);
    };

    const label = d3.select('#projectFilter')
        .selectAll('label')
        .data([
            {key: 'recent', default: true},
            {key: 'support', inverse: 'core', default: false}
        ])
        .enter()
        .append('label')
        .classed('checkbox', true)
        .attr('disabled', metadata ? null : true);
    label.append('input')
        .attr('type', 'checkbox')
        .property('checked', d => metadata ? d.default : !!d.inverse)
        .attr('disabled', metadata ? null : true)
        .on('change', () => {
            projectsNavigation.update(filter(projectData));
        });
    label.append('span')
        .text(d => locales.attribute("project-filter", d.key))
        .attr('title', d => locales.attribute("project-filter-title", d.key));

    return filter(projectData);
};

let makePage = function(commits, developers, weather, projects) {
    let currentCalendar;

    // All possible view options
    const dataOptions = [
        "total-commits", "commits-per-developer", "file-changes"
    ];

    // Current view settings
    let mode = dataOptions[0];
    let showWeather = false;

    // All project data
    const projectData = (_.size(projects) > 0 ?
        _.filter(projects, project => {
            return !!commits[project.name];
        }) :
        _.zipWith(_.keys(commits), key => {
            return {name: key};
        })
    );

    // Add weather toggle
    let weatherToggle = d3.select("#weatherToggle")
        .append("input")
        .attr("value", locales.message("weather-toggle"))
        .attr("type", "button")
        .attr("class", "data-button")
        .attr("disabled", _.isEmpty(weather) ? true : null)
        .classed("active", showWeather)
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
            } else if (!_.isEmpty(weather)) {
                weatherToggle.attr("disabled", null);
            }

            currentCalendar.setMode(dataOption);
            return true;
        },
        addElement: (element) => {
            element.text(d => locales.attribute("data-title", d))
                .attr('title', d => locales.attribute("data-description", d));
        }
    });

    // Add navigation to load each project
    const projectsNavigation = new navigation({
        container: '#projectPicker',
        prefix: 'project_',
        setCurrentItem: (project, hasProject) => {
            if (!hasProject && !commits[project]) {
                return false;
            }

            currentCalendar = new calendar({
                commits: commits[project],
                developers: developers[project],
                weather: weather
            }, {
                key: project,
                mode,
                showWeather,
                dataOptions
            }, locales);

            return true;
        },
        key: d => d.name,
        addElement: (element) => {
            element.style("width", "0%")
                .style("opacity", "0")
                .text(d => d.name)
                .attr('title', d => locales.message("project-title",
                    d.quality_display_name || d.name
                ))
                .transition()
                .style("width", "100%")
                .style("opacity", "1");
        },
        removeElement: (element) => {
            element.transition()
                .style("opacity", "0")
                .remove();
        }
    });

    const filteredData = buildProjectFilter(projectsNavigation, projectData,
        _.size(projects) > 0
    );

    // Show the calendar for the first project
    currentCalendar = new calendar(filteredData[0] ? {
        commits: commits[filteredData[0].name],
        developers: developers[filteredData[0].name],
        weather: weather
    } : {
        commits: {},
        developers: {},
        weather: {}
    }, {
        key: filteredData[0] ? filteredData[0].name : '',
        mode,
        showWeather,
        dataOptions
    }, locales);

    projectsNavigation.start(filteredData);
    dataNavigation.start(dataOptions);

    loadingSpinner.stop();
};

axios.all([
    axios.get('data/commit_volume.json'),
    axios.get('data/developers.json')
]).then(axios.spread(function(commits, developers) {
    axios.all([
        axios.get('data/weather.json'),
        axios.get('data/projects_meta.json')
    ]).then(axios.spread(function(weather, projects) {
        makePage(commits.data, developers.data, weather.data, projects.data);
    })).catch(function(error) {
        makePage(commits.data, developers.data, {}, []);
    });
})).catch(function (error) {
    throw error;
});

locales.updateMessages(d3.select('body'), [], null);

window.buildNavigation(navbar, locales, config);
