# Heatmap

This visualization produces a calendar of project activity over time, similar 
to developer activity overviews in GitHub and GitLab.

## Configuration

Copy the file `lib/config.json` to `config.json` and adjust environmental 
settings in that file. The following configuration items are known:

- `visualization_url`: The URL to the visualization hub. This may include 
  a protocol and domain name, but does not need to in case all the 
  visualizations and the heatmap are hosted on the same domain (for example in 
  a development environment). The remainder is a path to the root of the 
  visualizations, where the dashboard is found and every other visualization 
  has sub-paths below it.
- `path`: The relative path at which the heatmap is made available on the 
  server. This can remain the default `.` to work just fine.

## Data

The data for the sprint report can be analyzed and output through runs of 
scripts from the `data-analysis` repository upon a collection of Scrum data in 
a Grip on Software database as well as external weather data. The 
`commit_volume` and `developers` analysis reports as well as the `weather.r` 
script in the repository export data in JSON formats that is expected by the 
heatmap (for an example, see the `Collect` step in the `Jenkinsfile`). Note 
that one can also include temperature data from other sources than this script 
(which may be specific to certain data providers and data formats). The only 
requirement is that the `weather.json` data file, if available, contains a JSON 
object where the keys are dates in ISO 8601 format and the values are 
temperature values (assumed to be in degrees Celsius by the locale). If the 
`weather.json` file is not available, then turning on temperature bars is 
disabled in the visualization. The entire data collection must be placed in the 
`public/data` directory.

## Running

The visualization can be built using Node.js and `npm` by running `npm install` 
and then either `npm run watch` to start a development server that also 
refreshes browsers upon code changes, or `npm run production` to create 
a minimized bundle. The resulting HTML, CSS and JavaScript is made available in 
the `public` directory.

This repository also contains a `Dockerfile` specification for a Docker image 
that can performs the installation of the app and dependencies, which allows 
building the visualization within there. The `Jenkinsfile` contains appropriate 
steps for a Jenkins CI deployment, including data collection and visualization 
building.
