import * as d3 from "d3";

const config = {
    // Calendar layout properties
    calendaryearWidth: 1061, // Width of one calendar year
    svgHeight: 200, // Height of svg
    cellSize: 20, // Size of each day cell

    // The color scale used to display the commit size
    colors: ["#ffffc9","#edf8b1","#c7e9b4","#7fcdbb","#41b6c4","#1d91c0","#225ea8","#253494","#081d58"],

    // Month localization
    months: ["Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli", "Augustus", "September", "Oktober", "November", "December"],
}

export default config;
