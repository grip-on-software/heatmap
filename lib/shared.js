import _ from "lodash";

export const TOOLTIP_ATTR = 'data-tooltip';

// Round the given number to at most one decimal
const roundToOneDecimal = function(number) {
    return Math.round(number * 10) / 10;
};

// All possible view options
export const dataOptions = [
    {
        name: "total-commits",
        tooltip: (data, locales) => `<strong>${
            locales.message("tooltip-commits", [data.commit])}</strong><br>`,
        color: (data) => data.commit,
        temperature: true
    },
    {
        name: "commits-per-developer",
        tooltip: (data, locales) => `<strong>
            ${locales.message("tooltip-commits-per-developer", [
                roundToOneDecimal(data.commit / data.developer)
            ])}</strong><br>
            ${locales.message("tooltip-developers", [data.developer])}<br>`,
        color: (data) => data.commit / data.developer,
        temperature: true
    },
    {
        name: "file-changes",
        tooltip: (data, locales) => `<strong>${
            locales.message("tooltip-file-change", [
                _.size(data.filechanges)
            ])}</strong><br>`,
        color: (data) => data.filechanges.length,
        temperature: false,
        filechanges: true
    }
];
