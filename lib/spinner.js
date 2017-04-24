import * as d3 from 'd3';

const defaultConfiguration = {
    container: "#loader_container",
    id: 'loader',
    width: 960,
    height: 500,
    startAngle: 0
};

let config = {};

const spin = function(selection, duration) {
        if (d3.select(selection.node()).empty()) {
            return;
        }

        selection.transition()
            .ease(d3.easeLinear)
            .duration(duration)
            .attrTween("transform", () => {
                return d3.interpolateString(`rotate(${config.startAngle})`, `rotate(${config.startAngle-360})`);
            });

        setTimeout(() => { spin(selection, duration); }, duration);
    }

class spinner {
    // Create a new spinner instance with the given configuration
    constructor(configuration = {}) {
        config = Object.assign({}, defaultConfiguration, configuration);
    }

    // Start the loading spinner
    start() {
        var radius = Math.min(config.width, config.height) / 2;
        const tau = 2 * Math.PI;

        var innerArc = d3.arc()
            .innerRadius(radius*0.5)
            .outerRadius(radius*0.7)
            .startAngle(0);
        var outerArc = d3.arc()
            .innerRadius(radius*0.7)
            .outerRadius(radius*0.9)
            .startAngle(0);

        var group = d3.select(config.container).append("svg")
            .attr("id", config.id)
            .attr("width", config.width)
            .attr("height", config.height)
            .append("g")
            .attr("transform", `translate(${config.width / 2}, ${config.height / 2})`)
            .append("g")
            .call(spin, 1500);

        group.append("path")
            .datum({endAngle: 0.33*tau})
            .style("fill", "#B400C8")
            .attr("d", outerArc);
        group.append("path")
            .datum({endAngle: 0.33*tau})
            .style("fill", "#507AFF")
            .attr("d", innerArc);
    }

    // Hide the loading spinner
    stop() {
        d3.select(config.container).select('svg#' + config.id).remove();        
    }
}

export default spinner
