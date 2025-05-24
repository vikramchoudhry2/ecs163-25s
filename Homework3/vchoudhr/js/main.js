// Global variables
let emissionsData = [];
let gdpData = [];
let populationData = [];
let selectedCountries = new Set();
let currentYear = 2000;

// communication between visualizations
const dispatcher = d3.dispatch("countrySelected", "yearChanged", "brushed", "selectionCleared");

Promise.all([
    d3.csv("data/co2_emissions.csv"),
    d3.csv("data/gdp.csv"),
    d3.csv("data/population.csv")
]).then(([emissions, gdp, population]) => {
    emissionsData = processEmissionsData(emissions);
    gdpData = processGdpData(gdp);
    populationData = processPopulationData(population);
    
    // visualizations
    const overviewVis = new OverviewVis("#overview-vis", emissionsData, dispatcher);
    const detailVis = new DetailVis("#detail-vis", emissionsData, dispatcher);
    const advancedVis = new AdvancedVis("#advanced-vis", emissionsData, gdpData, populationData, dispatcher);
    
    // event listeners for the dispatcher
    dispatcher.on("countrySelected", (countryCode, selected) => {
        if (selected) {
            selectedCountries.add(countryCode);
        } else {
            selectedCountries.delete(countryCode);
        }
        
        detailVis.update(selectedCountries);
        advancedVis.highlightCountries(selectedCountries);
    });
    
    dispatcher.on("yearChanged", (year) => {
        currentYear = year;
        document.getElementById("selected-year").textContent = year;
        document.getElementById("year-slider").value = year;
        
        overviewVis.updateYear(year);
        advancedVis.updateYear(year);
    });
    
    dispatcher.on("brushed", (extent) => {
        detailVis.filterByTimeRange(extent);
    });
    
    dispatcher.on("selectionCleared", () => {
        selectedCountries.clear();
        detailVis.update(selectedCountries);
        overviewVis.clearSelection();
        advancedVis.clearHighlights();
    });
    
    // year slider
    const yearSlider = document.getElementById("year-slider");
    yearSlider.addEventListener("input", function() {
        dispatcher.call("yearChanged", null, parseInt(this.value));
    });
    
    // play button
    const playButton = document.getElementById("play-button");
    let playing = false;
    let timer;
    
    playButton.addEventListener("click", function() {
        if (playing) {
            clearInterval(timer);
            playButton.textContent = "Play";
            playing = false;
        } else {
            timer = setInterval(() => {
                currentYear = (currentYear >= 2020) ? 1990 : currentYear + 1;
                dispatcher.call("yearChanged", null, currentYear);
            }, 500);
            playButton.textContent = "Pause";
            playing = true;
        }
    });
    
    // reset zoom button
    document.getElementById("reset-zoom").addEventListener("click", function() {
        advancedVis.resetZoom();
    });
    
    // render
    dispatcher.call("yearChanged", null, currentYear);
});

// Data processing functions
function processEmissionsData(data) {
    return data.map(d => ({
        country: d.country,
        countryCode: d.code,
        year: +d.year,
        emissions: +d.emissions || 0
    }));
}

function processGdpData(data) {
    return data.map(d => ({
        country: d.country,
        countryCode: d.code,
        year: +d.year,
        gdp: +d.gdp || 0
    }));
}

function processPopulationData(data) {
    return data.map(d => ({
        country: d.country,
        countryCode: d.code,
        year: +d.year,
        population: +d.population || 0
    }));
} 