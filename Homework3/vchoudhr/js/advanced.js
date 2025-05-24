class AdvancedVis {
    constructor(parentElement, emissionsData, gdpData, populationData, dispatcher) {
        this.parentElement = parentElement;
        this.emissionsData = emissionsData;
        this.gdpData = gdpData;
        this.populationData = populationData;
        this.dispatcher = dispatcher;
        this.currentYear = 2000;
        this.highlightedCountries = new Set();
        
        this.initVis();
    }
    
    initVis() {
        const vis = this;
        
        // dimensions and margins
        vis.margin = { top: 40, right: 40, bottom: 60, left: 60 };
        vis.width = document.querySelector(vis.parentElement).getBoundingClientRect().width - vis.margin.left - vis.margin.right;
        vis.height = 300 - vis.margin.top - vis.margin.bottom;
        
        // SVG element
        vis.svg = d3.select(vis.parentElement)
            .append("svg")
            .attr("width", vis.width + vis.margin.left + vis.margin.right)
            .attr("height", vis.height + vis.margin.top + vis.margin.bottom)
            .append("g")
            .attr("transform", `translate(${vis.margin.left}, ${vis.margin.top})`);
        
        // make scales
        vis.xScale = d3.scaleLog()
            .domain([100, 100000])  // GDP per capita in USD
            .range([0, vis.width])
            .clamp(true);
            
        vis.yScale = d3.scaleLog()
            .domain([0.1, 20])  // CO2 emissions per capita in metric tons
            .range([vis.height, 0])
            .clamp(true);
            
        vis.radiusScale = d3.scaleSqrt()
            .domain([1000000, 1400000000])  // Population range
            .range([4, 30]);
            
        // make axes
        vis.xAxis = d3.axisBottom(vis.xScale)
            .tickFormat(d => {
                return d3.format(".0s")(d).replace("G", "B");
            });
            
        vis.yAxis = d3.axisLeft(vis.yScale)
            .tickFormat(d => {
                return d3.format(".1f")(d);
            });
            
        // add axes to SVG
        vis.svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0, ${vis.height})`)
            .call(vis.xAxis);
            
        vis.svg.append("g")
            .attr("class", "y-axis")
            .call(vis.yAxis);
            
        // add axis labels
        vis.svg.append("text")
            .attr("class", "axis-label")
            .attr("x", vis.width / 2)
            .attr("y", vis.height + 40)
            .style("text-anchor", "middle")
            .text("GDP per Capita (USD)");
            
        vis.svg.append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            .attr("x", -vis.height / 2)
            .attr("y", -40)
            .style("text-anchor", "middle")
            .text("CO2 Emissions per Capita (metric tons)");
            
        // tooltip
        vis.tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);
            
        // year label
        vis.yearLabel = vis.svg.append("text")
            .attr("class", "year-label")
            .attr("x", vis.width - 50)
            .attr("y", 20)
            .style("text-anchor", "end")
            .style("font-size", "24px")
            .style("font-weight", "bold")
            .style("opacity", 0.3)
            .text(vis.currentYear);
            
        // zoom behavior
        vis.zoom = d3.zoom()
            .scaleExtent([1, 8])
            .extent([[0, 0], [vis.width, vis.height]])
            .on("zoom", function(event) {
                // apply zoom transformation to the chart
                vis.svg.selectAll(".circle")
                    .attr("transform", event.transform);
                
                // update axes
                const newXScale = event.transform.rescaleX(vis.xScale);
                const newYScale = event.transform.rescaleY(vis.yScale);
                
                vis.svg.select(".x-axis").call(vis.xAxis.scale(newXScale));
                vis.svg.select(".y-axis").call(vis.yAxis.scale(newYScale));
            });
            
        // apply zoom behavior to SVG
        vis.svg.call(vis.zoom);
        
        // clip path
        vis.svg.append("defs").append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", vis.width)
            .attr("height", vis.height);
            
        // make a group for the circles with clip path
        vis.circlesGroup = vis.svg.append("g")
            .attr("clip-path", "url(#clip)");
            
        // process the data
        vis.wrangleData();
    }
    
    wrangleData() {
        const vis = this;
        
        // combine data for the current year
        vis.displayData = [];
        
        // unique country codes
        const countryCodes = new Set();
        vis.emissionsData.forEach(d => countryCodes.add(d.countryCode));
        
        // each country, find the data for the current year
        countryCodes.forEach(countryCode => {
            const emissionsEntry = vis.emissionsData.find(d => 
                d.countryCode === countryCode && d.year === vis.currentYear);
                
            const gdpEntry = vis.gdpData.find(d => 
                d.countryCode === countryCode && d.year === vis.currentYear);
                
            const populationEntry = vis.populationData.find(d => 
                d.countryCode === countryCode && d.year === vis.currentYear);
                
            // add if we have all three data points
            if (emissionsEntry && gdpEntry && populationEntry) {
                const gdpPerCapita = gdpEntry.gdp / populationEntry.population;
                const emissionsPerCapita = emissionsEntry.emissions / populationEntry.population * 1000; // Convert to metric tons
                
                // add if values are valid
                if (gdpPerCapita > 0 && emissionsPerCapita > 0) {
                    vis.displayData.push({
                        country: emissionsEntry.country,
                        countryCode: countryCode,
                        gdpPerCapita: gdpPerCapita,
                        emissionsPerCapita: emissionsPerCapita,
                        population: populationEntry.population
                    });
                }
            }
        });
        
        vis.updateVis();
    }
    
    updateVis() {
        const vis = this;
        
        vis.xScale.domain([
            d3.min(vis.displayData, d => Math.max(100, d.gdpPerCapita * 0.8)),
            d3.max(vis.displayData, d => d.gdpPerCapita * 1.2)
        ]);
        
        vis.yScale.domain([
            d3.min(vis.displayData, d => Math.max(0.1, d.emissionsPerCapita * 0.8)),
            d3.max(vis.displayData, d => d.emissionsPerCapita * 1.2)
        ]);
        
        vis.radiusScale.domain([
            d3.min(vis.displayData, d => d.population),
            d3.max(vis.displayData, d => d.population)
        ]);
        
        vis.svg.select(".x-axis")
            .transition()
            .duration(500)
            .call(vis.xAxis);
            
        vis.svg.select(".y-axis")
            .transition()
            .duration(500)
            .call(vis.yAxis);
            
        // update year label
        vis.yearLabel.text(vis.currentYear);
        
        const circles = vis.circlesGroup.selectAll(".circle")
            .data(vis.displayData, d => d.countryCode);
            
        const circlesEnter = circles.enter()
            .append("circle")
            .attr("class", "circle")
            .attr("cx", d => vis.xScale(d.gdpPerCapita))
            .attr("cy", d => vis.yScale(d.emissionsPerCapita))
            .attr("r", 0)
            .attr("fill", d => vis.highlightedCountries.has(d.countryCode) ? "#ff6b6b" : "#69b3a2")
            .attr("opacity", d => vis.highlightedCountries.has(d.countryCode) ? 0.9 : 0.7)
            .attr("stroke", d => vis.highlightedCountries.has(d.countryCode) ? "#c44" : "#fff");
            
        circlesEnter.merge(circles)
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .attr("stroke-width", 2);
                    
                vis.tooltip
                    .style("opacity", 1)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px")
                    .html(`
                        <strong>${d.country}</strong><br>
                        GDP per capita: $${d3.format(",.0f")(d.gdpPerCapita)}<br>
                        CO2 per capita: ${d3.format(".2f")(d.emissionsPerCapita)} tons<br>
                        Population: ${d3.format(".3s")(d.population)}
                    `);
            })
            .on("mouseout", function() {
                d3.select(this)
                    .attr("stroke-width", 1);
                    
                vis.tooltip.style("opacity", 0);
            })
            .on("click", function(event, d) {
                const isSelected = vis.highlightedCountries.has(d.countryCode);
                vis.dispatcher.call("countrySelected", null, d.countryCode, !isSelected);
            })
            .transition()
            .duration(500)
            .attr("cx", d => vis.xScale(d.gdpPerCapita))
            .attr("cy", d => vis.yScale(d.emissionsPerCapita))
            .attr("r", d => vis.radiusScale(d.population))
            .attr("fill", d => vis.highlightedCountries.has(d.countryCode) ? "#ff6b6b" : "#69b3a2")
            .attr("opacity", d => vis.highlightedCountries.has(d.countryCode) ? 0.9 : 0.7)
            .attr("stroke", d => vis.highlightedCountries.has(d.countryCode) ? "#c44" : "#fff");
            
        circles.exit()
            .transition()
            .duration(500)
            .attr("r", 0)
            .remove();
    }
    
    updateYear(year) {
        const vis = this;
        vis.currentYear = year;
        vis.wrangleData();
    }
    
    highlightCountries(countrySet) {
        const vis = this;
        vis.highlightedCountries = countrySet;
        
        vis.circlesGroup.selectAll(".circle")
            .transition()
            .duration(300)
            .attr("fill", d => vis.highlightedCountries.has(d.countryCode) ? "#ff6b6b" : "#69b3a2")
            .attr("opacity", d => vis.highlightedCountries.has(d.countryCode) ? 0.9 : 0.7)
            .attr("stroke", d => vis.highlightedCountries.has(d.countryCode) ? "#c44" : "#fff")
            .attr("stroke-width", d => vis.highlightedCountries.has(d.countryCode) ? 2 : 1);
    }
    
    clearHighlights() {
        const vis = this;
        vis.highlightedCountries.clear();
        
        vis.circlesGroup.selectAll(".circle")
            .transition()
            .duration(300)
            .attr("fill", "#69b3a2")
            .attr("opacity", 0.7)
            .attr("stroke", "#fff")
            .attr("stroke-width", 1);
    }
    
    resetZoom() {
        const vis = this;
        vis.svg.transition()
            .duration(750)
            .call(vis.zoom.transform, d3.zoomIdentity);
    }
} 