import * as d3 from "d3";

const FONT_SIZE = 16; // in pixels
const TOOLTIP_WIDTH = 15; // in rem

const tooltip = {};

// Update the position of the tooltip.
tooltip.setLocation = (event) => {
    const rightOrLeftLimit = FONT_SIZE * TOOLTIP_WIDTH;
    const direction = event.pageX > rightOrLeftLimit ? 'right' : 'left';

    const ARROW_MARGIN = 1.65;
    const ARROW_WIDTH = FONT_SIZE;
    const arrow_offset = ARROW_MARGIN * FONT_SIZE + ARROW_WIDTH / 2;
    const left = direction === 'right' ?
        event.pageX - rightOrLeftLimit + arrow_offset :
        event.pageX - arrow_offset;

    d3.select('#tooltip')
        .classed(direction === 'right' ? 'left' : 'right', false)
        .classed(direction, true)
        .style("left", `${left}px`)
        .style("top", `${(event.pageY + 16)}px`);
};

// Display a tooltip with a `title` and `message` at the event position.
tooltip.show = (title, message) => {
    d3.select('body').select('#tooltip').remove();

    const element = d3.select('body')
        .append('div')
        .attr('id', 'tooltip')
        .style('opacity', 0); // hide it by default

    // show the tooltip with a small animation
    element.transition()
        .duration(200)
        .on('start', function start() {
            d3.select(this).style('block');
        })
        .style('opacity', 1);
    element.on('mouseout', tooltip.hide);

    element.html(`
            <div class="commit">
                <div class="content">
                    <h3 class="message">${title}</h3>
                    <p>
                        ${message}
                    </p>
                </div>
            </div>
            `);

    tooltip.setLocation(d3.event);
};

// Hide the tooltip.
tooltip.hide = () => {
    d3.select('#tooltip').transition()
        .duration(200)
        .on('end', function end() {
            this.remove();
        })
        .style('opacity', 0);
};

export default tooltip;
