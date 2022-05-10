/**
 * Large tooltip with HTML-based content.
 *
 * Copyright 2017-2020 ICTU
 * Copyright 2017-2022 Leiden University
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
import * as d3 from "d3";

const FONT_SIZE = 16; // in pixels
const TOOLTIP_WIDTH = 15; // in rem

const tooltip = {};

/* Update the position of the tooltip based on a mouse or focus event. */
tooltip.setLocation = (event) => {
    if (typeof event.pageX === "undefined") {
        // Some browsers do not automatically scroll a focus into view
        d3.select(event.currentTarget).select('rect').node().scrollIntoView();

        const target = event.currentTarget.getBoundingClientRect();
        tooltip.setPosition(target.left + window.scrollX + target.width / 2,
                            target.top + window.scrollY + target.height / 2);
    }
    else {
        tooltip.setPosition(event.pageX, event.pageY);
    }
};

/* Update the position of the tooltip based on specific coordinates. */
tooltip.setPosition = (x, y) => {
    const rightOrLeftLimit = FONT_SIZE * TOOLTIP_WIDTH;
    const direction = x > rightOrLeftLimit ? 'right' : 'left';

    const ARROW_MARGIN = 1.65;
    const ARROW_WIDTH = FONT_SIZE;
    const arrowOffset = ARROW_MARGIN * FONT_SIZE + ARROW_WIDTH / 2;
    const left = direction === 'right' ?
        x - rightOrLeftLimit + arrowOffset :
        x - arrowOffset;

    d3.select('#tooltip')
        .classed(direction === 'right' ? 'left' : 'right', false)
        .classed(direction, true)
        .style("left", `${left}px`)
        .style("top", `${(y + 16)}px`);
};

/* Display a tooltip with a `title` and `message` at the event position. */
tooltip.show = (event, title, message) => {
    d3.select('main').select('#tooltip').remove();

    const element = d3.select('main')
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

    const content = element.append('div')
        .classed('commitdate', true)
        .append('div')
        .classed('content', true);
    content.append('h3')
        .classed('message', true)
        .text(title);
    content.append('p').html(message);

    tooltip.setLocation(event);
};

/* Hide the tooltip. */
tooltip.hide = () => {
    d3.select('#tooltip').transition()
        .duration(200)
        .on('end', function end() {
            this.remove();
        })
        .style('opacity', 0);
};

export default tooltip;
