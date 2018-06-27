import _ from 'lodash';
import * as d3 from 'd3';
import calendar from './calendar';
import {navigation} from '@gros/visualization-ui';

// All possible view options
const dataOptions = [
    "total-commits", "commits-per-developer", "file-changes"
];

class builder {
    constructor(commits, developers, weather, projects, sources, locales) {
        this.currentCalendar = null;
        this.hasMetadata = !_.isEmpty(projects);
        this.projectData = (this.hasMetadata ?
            _.filter(projects, project => {
                return !!commits[project.name];
            }) :
            _.zipWith(_.keys(commits), key => {
                return {name: key};
            })
        );
        this.metadata = _.keyBy(this.projectData, d => d.name);

        this.commits = commits;
        this.developers = developers;
        this.weather = weather;
        this.projects = projects;
        this.sources = sources;

        this.locales = locales;
    }

    build() {
        this.buildToggle();
        this.buildDataNavigation();

        // Add navigation to load each project
        const projectsNavigation = new navigation({
            container: '#projectPicker',
            prefix: 'project_',
            setCurrentItem: (project, hasProject) => {
                if (!hasProject && !this.commits[project]) {
                    return false;
                }

                this.currentCalendar = this.buildCalendar(project);
                return true;
            },
            key: d => d.name,
            addElement: (element) => {
                element.style("width", "0%")
                    .style("opacity", "0")
                    .text(d => d.name)
                    .attr('title', d => this.locales.message("project-title",
                        [d.quality_display_name || d.name]
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

        this.buildProjectFilter(projectsNavigation);

        const filteredData = this.filterProjects();

        // Show the calendar for the first project
        this.currentCalendar = this.buildCalendar(filteredData[0] ?
            filteredData[0].name : ''
        );

        projectsNavigation.start(filteredData);
    }

    buildToggle() {
        // Add weather toggle
        d3.select("#weatherToggle")
            .append("input")
            .attr("value", this.locales.message("weather-toggle"))
            .attr("type", "button")
            .attr("class", "data-button")
            .attr("disabled", _.isEmpty(this.weather) ? true : null)
            .on("click", (d, element, buttons) => {
                if (this.currentCalendar) {
                    d3.select(buttons[element]).classed('active',
                        !this.currentCalendar.config.showWeather
                    );
                    this.currentCalendar.toggleTemperatureBars();
                }
            });
    }

    buildDataNavigation() {
        // Add navigation for switching between the different data views
        const dataNavigation = new navigation({
            container: '#dataPicker',
            prefix: 'mode_',
            setCurrentItem: (dataOption, hasDataOption) => {
                if (!hasDataOption) {
                    return false;
                }
                if (dataOption === 'file-changes') {
                    d3.select("#weatherToggle .data-button")
                        .attr("disabled", true)
                        .classed("active", false);

                    // Don't show the temperature bars for the file-changes data
                    if (this.currentCalendar && this.currentCalendar.config.showWeather) {
                        this.currentCalendar.toggleTemperatureBars();
                    }
                } else if (!_.isEmpty(this.weather)) {
                    d3.select("#weatherToggle .data-button")
                        .attr("disabled", null);
                }

                if (this.currentCalendar) {
                    this.currentCalendar.setMode(dataOption);
                }
                return true;
            },
            addElement: (element) => {
                element.text(d => this.locales.attribute("data-title", d))
                    .attr('title', d => this.locales.attribute("data-description", d));
            }
        });

        dataNavigation.start(dataOptions);
    }

    buildCalendar(project) {
        return new calendar({
            commits: this.commits[project],
            developers: this.developers[project],
            weather: this.weather
        }, {
            key: project,
            metadata: this.metadata[project] || {},
            sources: this.sources[project] || {},
            mode: this.currentCalendar ?
                this.currentCalendar.config.mode : dataOptions[0],
            showWeather: this.currentCalendar ?
                this.currentCalendar.config.showWeather : false,
            dataOptions
        }, this.locales);
    }

    filterProjects() {
        const filters = {};
        d3.selectAll('#projectFilter input').each(function(d) {
            const checked = d3.select(this).property('checked');
            const bits = d.inverse ? [d.inverse, !checked] : [d.key, checked];
            if (bits[1]) {
                filters[bits[0]] = true;
            }
        });

        return _.filter(this.projectData, filters);
    }

    buildProjectFilter(projectsNavigation) {
        const label = d3.select('#projectFilter')
            .selectAll('label')
            .data([
                {key: 'recent', default: true},
                {key: 'support', inverse: 'core', default: false}
            ])
            .enter()
            .append('label')
            .classed('checkbox', true)
            .attr('disabled', this.hasMetadata ? null : true);
        label.append('input')
            .attr('type', 'checkbox')
            .property('checked', d => this.hasMetadata ? d.default : !!d.inverse)
            .attr('disabled', this.hasMetadata ? null : true)
            .on('change', () => {
                projectsNavigation.update(this.filterProjects());
            });
        label.append('span')
            .text(d => this.locales.attribute("project-filter", d.key))
            .attr('title', d => this.locales.attribute("project-filter-title", d.key));
    }
}

export default builder;
