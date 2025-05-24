class DetailVis {
    constructor(parentElement, data, dispatcher) {
        this.parentElement = parentElement;
        this.data = data;
        this.dispatcher = dispatcher;
        this.selectedCountries = new Set();
        this.filteredYearRange = null;
        
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
        
        // scales
        vis.xScale = d3.scaleLinear()
            .domain([1990, 2020])
            .range([0, vis.width]);
            
        vis.yScale = d3.scaleLinear()
            .domain([0, 10000])  // update with actual data
            .range([vis.height, 0]);
            
        // make axes
        vis.xAxis = d3.axisBottom(vis.xScale)
            .tickFormat(d3.format("d"));
            
        vis.yAxis = d3.axisLeft(vis.yScale);
            
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
            .text("Year");
            
        vis.svg.append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            .attr("x", -vis.height / 2)
            .attr("y", -40)
            .style("text-anchor", "middle")
            .text("CO2 Emissions (kt)");
            
        // make line generator
        vis.line = d3.line()
            .x(d => vis.xScale(d.year))
            .y(d => vis.yScale(d.emissions));
            
        // make color scale for countries
        vis.colorScale = d3.scaleOrdinal(d3.schemeCategory10);
        
        // make tooltip
        vis.tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);
            
        // make brush
        vis.brush = d3.brushX()
            .extent([[0, 0], [vis.width, vis.height]])
            .on("end", function(event) {
                if (!event.selection) {
                    vis.filteredYearRange = null;
                    vis.dispatcher.call("brushed", null, null);
                    return;
                }
                
                const [x0, x1] = event.selection;
                const [year0, year1] = [vis.xScale.invert(x0), vis.xScale.invert(x1)];
                vis.filteredYearRange = [Math.floor(year0), Math.ceil(year1)];
                vis.dispatcher.call("brushed", null, vis.filteredYearRange);
            });
            
        vis.brushGroup = vis.svg.append("g")
            .attr("class", "brush")
            .call(vis.brush);
            
        // make legend
        vis.legend = vis.svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${vis.width - 120}, 0)`);
            
        // add no data message
        vis.noDataMessage = vis.svg.append("text")
            .attr("class", "no-data-message")
            .attr("x", vis.width / 2)
            .attr("y", vis.height / 2)
            .style("text-anchor", "middle")
            .style("font-size", "14px")
            .style("fill", "#888")
            .text("Select countries on the map to see their emissions over time")
            .style("opacity", 1);
    }
    
    update(selectedCountries) {
        const vis = this;
        vis.selectedCountries = selectedCountries;
        
        // check if we have selected countries
        if (selectedCountries.size === 0) {
            vis.noDataMessage.style("opacity", 1);
            vis.svg.selectAll(".line").remove();
            vis.svg.selectAll(".legend-item").remove();
            return;
        }
        
        vis.noDataMessage.style("opacity", 0);
        
        // get data for selected countries
        const selectedCountriesData = [];
        selectedCountries.forEach(countryCode => {
            const countryData = vis.data.filter(d => d.countryCode === countryCode);
            if (countryData.length > 0) {
                selectedCountriesData.push({
                    country: countryData[0].country,
                    countryCode: countryCode,
                    values: countryData.sort((a, b) => a.year - b.year)
                });
            }
        });
        
        // update y-scale domain based on selected data
        const maxEmissions = d3.max(selectedCountriesData, d => 
            d3.max(d.values, v => v.emissions)
        );
        vis.yScale.domain([0, maxEmissions * 1.1]);
        
        // update y-axis
        vis.svg.select(".y-axis")
            .transition()
            .duration(500)
            .call(vis.yAxis);
        
        // draw lines
        const lines = vis.svg.selectAll(".line")
            .data(selectedCountriesData, d => d.countryCode);
            
        // enter
        const linesEnter = lines.enter()
            .append("path")
            .attr("class", "line")
            .attr("stroke", d => vis.colorScale(d.countryCode))
            .attr("stroke-width", 2)
            .attr("fill", "none")
            .attr("d", d => vis.line(d.values))
            .style("opacity", 0);
            
        // enter + update
        linesEnter.merge(lines)
            .transition()
            .duration(500)
            .attr("d", d => vis.line(d.values))
            .style("opacity", 1);
            
        // exit
        lines.exit()
            .transition()
            .duration(500)
            .style("opacity", 0)
            .remove();
            
        // update legend
        const legendItems = vis.legend.selectAll(".legend-item")
            .data(selectedCountriesData, d => d.countryCode);
            
        // enter
        const legendEnter = legendItems.enter()
            .append("g")
            .attr("class", "legend-item")
            .attr("transform", (d, i) => `translate(0, ${i * 20})`);
            
        legendEnter.append("rect")
            .attr("width", 10)
            .attr("height", 10)
            .attr("fill", d => vis.colorScale(d.countryCode));
            
        legendEnter.append("text")
            .attr("x", 15)
            .attr("y", 10)
            .text(d => d.country)
            .style("font-size", "12px");
            
        // update
        legendItems.attr("transform", (d, i) => `translate(0, ${i * 20})`);
        
        legendItems.exit().remove();
    }
    
    filterByTimeRange(range) {
        const vis = this;
        
        if (!range) {
            // reset the x-scale
            vis.xScale.domain([1990, 2020]);
            
            vis.svg.select(".x-axis")
                .transition()
                .duration(500)
                .call(vis.xAxis);
                
            vis.svg.selectAll(".line")
                .transition()
                .duration(500)
                .attr("d", d => vis.line(d.values));
                
            return;
        }
        
        // update x-scale domain based on brush
        vis.xScale.domain(range);
        
        // update x-axis
        vis.svg.select(".x-axis")
            .transition()
            .duration(500)
            .call(vis.xAxis);
            
        // update lines
        vis.svg.selectAll(".line")
            .transition()
            .duration(500)
            .attr("d", d => vis.line(d.values));
    }
} 