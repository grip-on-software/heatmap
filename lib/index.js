/**
 * Main entry point for the heat map calendar.
 */
import * as d3 from 'd3';
import axios from 'axios';
import Builder from './Builder';
import spec from './locales.json';
import config from 'config.json';
import {Locale, Navbar, Spinner} from '@gros/visualization-ui';

const locales = new Locale(spec);
const searchParams = new URLSearchParams(window.location.search);
locales.select(searchParams.get("lang"));

const loadingSpinner = new Spinner({
    width: d3.select('#calendar').node().clientWidth,
    height: 230, // calendar default configuration svgHeight
    startAngle: 220,
    container: '#calendar',
    id: 'loading-spinner'
});

loadingSpinner.start();

/* Create the entire page. */
const makePage = function(commits, developers, weather, projects, sources) {
    const page = new Builder(locales);
    page.build(commits, developers, weather, projects, sources);
    loadingSpinner.stop();
};

// Collect data
axios.all([
    axios.get('data/commit_volume.json'),
    axios.get('data/developers.json')
]).then(axios.spread(function(commits, developers) {
    axios.all([
        axios.get('data/weather.json'),
        axios.get('data/projects_meta.json'),
        axios.get('data/projects_sources.json')
    ]).then(axios.spread(function(weather, projects, sources) {
        makePage(commits.data, developers.data, weather.data, projects.data,
            sources.data
        );
    })).catch(function(error) {
        makePage(commits.data, developers.data, {}, [], {});
    });
})).catch(function (error) {
    throw error;
});

locales.updateMessages(d3.select('body'), [], null);

if (typeof window.buildNavigation === "function") {
    window.buildNavigation(Navbar, locales, config);
}
