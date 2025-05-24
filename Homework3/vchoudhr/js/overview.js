class OverviewVis {
    constructor(parentElement, data, dispatcher) {
        this.parentElement = parentElement;
        this.data = data;
        this.dispatcher = dispatcher;
        
        this.initVis();
    }
    
    initVis() {
        const vis = this;
        
        // dimensions and margins
        vis.margin = { top: 20, right: 20, bottom: 20, left: 20 };
        vis.width = document.querySelector(vis.parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
        vis.height = 500 - vis.margin.top - vis.margin.bottom;
        
        vis.svg = d3.select(vis.parentElement)
            .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", `translate(${vis.margin.left}, ${vis.margin.top})`);
        
        // make the projection
        vis.projection = d3.geoNaturalEarth1()
            .scale(vis.width / 5.5)
            .translate([vis.width / 2, vis.height / 2]);
            

        vis.pathGenerator = d3.geoPath().projection(vis.projection);
        
        vis.colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
            .domain([0, 10000]);
        
        vis.createLegend();
        
        vis.tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);
        
        // world map data from a github repo
        d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
            .then(geoData => {
                vis.geoData = geoData;
                vis.wrangleData();
            });
    }
    
    wrangleData() {
        const vis = this;
        
        // process data for the current year
        vis.displayData = {};
        
        // group data by country and year
        const dataByCountry = d3.group(vis.data, d => d.countryCode);
        
        // min and max emissions for color scale
        const allEmissions = vis.data.map(d => d.emissions).filter(d => d > 0);
        const maxEmissions = d3.max(allEmissions);
        
        vis.colorScale.domain([0, maxEmissions]);
        
        vis.updateVis();
    }
    
    updateVis() {
        const vis = this;
        
        const countries = vis.svg.selectAll(".country")
            .data(vis.geoData.features);
            
        const countriesEnter = countries.enter()
            .append("path")
            .attr("class", "country")
            .attr("d", vis.pathGenerator);
            
        countriesEnter.merge(countries)
            .attr("fill", d => {
                const countryData = vis.data.find(item => 
                    item.countryCode === d.id && item.year === vis.currentYear);
                return countryData ? vis.colorScale(countryData.emissions) : "#ccc";
            })
            .on("mouseover", function(event, d) {
                const countryData = vis.data.find(item => 
                    item.countryCode === d.id && item.year === vis.currentYear);
                
                if (countryData) {
                    d3.select(this).attr("stroke-width", "2px");
                    
                    vis.tooltip
                        .style("opacity", 1)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 10) + "px")
                        .html(`
                            <strong>${countryData.country}</strong><br>
                            CO2 Emissions: ${d3.format(",.0f")(countryData.emissions)} kt<br>
                            Year: ${vis.currentYear}
                        `);
                }
            })
            .on("mouseout", function() {
                d3.select(this).attr("stroke-width", "0.5px");
                vis.tooltip.style("opacity", 0);
            })
            .on("click", function(event, d) {
                const countryData = vis.data.find(item => 
                    item.countryCode === d.id && item.year === vis.currentYear);
                
                if (countryData) {
                    const isSelected = d3.select(this).classed("selected");
                    d3.select(this).classed("selected", !isSelected);
                    
                    vis.dispatcher.call("countrySelected", null, countryData.countryCode, !isSelected);
                }
            });
            
        countries.exit().remove();
    }
    
    updateYear(year) {
        const vis = this;
        vis.currentYear = year;
        
        vis.svg.selectAll(".country")
            .transition()
            .duration(300)
            .attr("fill", d => {
                const countryData = vis.data.find(item => 
                    item.countryCode === d.id && item.year === vis.currentYear);
                return countryData ? vis.colorScale(countryData.emissions) : "#ccc";
            });
    }
    
    createLegend() {
        const vis = this;
        
        vis.legend = vis.svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(20, ${vis.height - 40})`);
            
        const legendWidth = 200;
        const legendHeight = 10;
        
        const defs = vis.svg.append("defs");
        const linearGradient = defs.append("linearGradient")
            .attr("id", "emissions-gradient");
            
        linearGradient.selectAll("stop")
            .data([
                {offset: "0%", color: vis.colorScale(0)},
                {offset: "100%", color: vis.colorScale(10000)}
            ])
            .enter().append("stop")
            .attr("offset", d => d.offset)
            .attr("stop-color", d => d.color);
            
        vis.legend.append("rect")
            .attr("width", legendWidth)
            .attr("height", legendHeight)
            .style("fill", "url(#emissions-gradient)");
            
        vis.legend.append("text")
            .attr("class", "legend-title")
            .attr("x", 0)
            .attr("y", -5)
            .text("CO2 Emissions (kt)");
            
        vis.legend.append("text")
            .attr("class", "legend-label")
            .attr("x", 0)
            .attr("y", legendHeight + 15)
            .text("0");
            
        vis.legend.append("text")
            .attr("class", "legend-label")
            .attr("x", legendWidth)
            .attr("y", legendHeight + 15)
            .style("text-anchor", "end")
            .text("10,000+");
    }
    
    clearSelection() {
        const vis = this;
        vis.svg.selectAll(".country.selected").classed("selected", false);
    }
} 