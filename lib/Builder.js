/**
 * Construction of the heat map calendar.
 *
 * Copyright 2017-2020 ICTU
 * Copyright 2017-2022 Leiden University
 * Copyright 2017-2023 Leon Helwerda
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import _ from 'lodash';
import * as d3 from 'd3';
import {TOOLTIP_ATTR, dataOptions} from './shared';
import Calendar from './Calendar';
import {Navigation} from '@gros/visualization-ui';

/**
 * Class that handles constructing a heat map calendar with selected options.
 */
class Builder {
    constructor(locales) {
        this.currentCalendar = null;
        this.locales = locales;
    }

    /**
     * Build the selection options for projects, calendar data mode and
     * temperature toggle.
     */
    build(commits, developers, weather, projects, sources) {
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

        this.buildToggle();
        this.buildDataNavigation();

        // Add navigation to load each project
        const projectsNavigation = new Navigation({
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
                    .classed('tooltip', true)
                    .attr(TOOLTIP_ATTR, d => this.locales.message("project-title",
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

    /**
     * Add a weather toggle.
     */
    buildToggle() {
        const enable = this.locales.message("weather-toggle-enable-title"),
              disable = this.locales.message("weather-toggle-disable-title");
        d3.select("#weatherToggle")
            .append("button")
            .attr("class", "button is-small data-button tooltip has-tooltip-bottom")
            .attr("disabled", _.isEmpty(this.weather) ? true : null)
            .text(this.locales.message("weather-toggle"))
            .attr(TOOLTIP_ATTR, enable)
            .on("click", (event, d) => {
                if (this.currentCalendar) {
                    const enabled = this.currentCalendar.config.showWeather;
                    d3.select(event.currentTarget)
                        .attr(TOOLTIP_ATTR, enabled ? enable : disable)
                        .classed("active", !enabled);
                    this.currentCalendar.toggleTemperatureBars();
                }
            });
    }

    /**
     * Add navigation for switching between the different data views.
     */
    buildDataNavigation() {
        const dataNavigation = new Navigation({
            container: '#dataPicker',
            prefix: 'mode_',
            key: d => d.name,
            isActive: (key, currentItem, d) => key === currentItem && !d.disabled,
            setCurrentItem: (dataOption, hasDataOption) => {
                if (!hasDataOption) {
                    return false;
                }
                const mode = _.find(dataOptions,
                    option => option.name === dataOption && !option.disabled
                );
                if (!mode) {
                    return false;
                }

                if (!mode.temperature) {
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
                    this.currentCalendar.setMode(mode);
                }
                return true;
            },
            addElement: (element) => {
                element.text(d => this.locales.attribute("data-title", d.name))
                    .classed('tooltip has-tooltip-bottom has-tooltip-multiline', true)
                    .classed('is-disabled', d => !!d.disabled)
                    .attr('href', d => d.disabled ? null : `#mode_${d.name}`)
                    .attr(TOOLTIP_ATTR, d => this.locales.attribute("data-description", d.name));
            }
        });

        dataNavigation.start(dataOptions);
    }

    /**
     * Build the calendar with all loaded data.
     */
    buildCalendar(project) {
        return new Calendar({
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
                this.currentCalendar.config.showWeather : false
        }, this.locales);
    }

    /**
     * Filter the projects to display in the navigation.
     */
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

    /**
     * Create checkboxes to select which types of projects to show in the
     * navigation.
     */
    buildProjectFilter(projectsNavigation) {
        const label = d3.select('#projectFilter')
            .selectAll('label')
            .data([
                {key: 'recent', default: true},
                {key: 'support', inverse: 'core', default: false}
            ])
            .enter()
            .append('label')
            .classed('checkbox tooltip', true)
            .attr('disabled', this.hasMetadata ? null : true)
            .attr(TOOLTIP_ATTR, d => this.locales.attribute("project-filter-title", d.key));
        label.append('input')
            .attr('type', 'checkbox')
            .property('checked', d => this.hasMetadata ? d.default : !!d.inverse)
            .attr('disabled', this.hasMetadata ? null : true)
            .on('change', () => {
                projectsNavigation.update(this.filterProjects());
            });
        label.append('span')
            .text(d => this.locales.attribute("project-filter", d.key));
    }
}

export default Builder;
