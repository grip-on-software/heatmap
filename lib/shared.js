/**
 * Reusable utilities and constants.
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
