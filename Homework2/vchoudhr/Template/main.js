d3.csv("mxmh_survey_results.csv").then(data => {
    // parse the data
    data = data.filter(d =>
      d.Age && d["Fav genre"] &&
      d.Anxiety && d.Depression && d.Insomnia && d.OCD
    );
  
    // heatmap
    const genres = [...new Set(data.map(d => d["Fav genre"]))];
    const fields = ["Anxiety", "Depression", "Insomnia", "OCD"];
  
    const heatmapData = [];
    genres.forEach(genre => {
      const rows = data.filter(d => d["Fav genre"] === genre);
      fields.forEach(field => {
        heatmapData.push({
          genre,
          field,
          value: d3.mean(rows, r => +r[field])
        });
      });
    });
  
    const heatSvg = d3.select("#heatmap"),
          margin = { top: 50, right: 30, bottom: 50, left: 120 },
          width = +heatSvg.attr("width") - margin.left - margin.right,
          height = +heatSvg.attr("height") - margin.top - margin.bottom;
  
    const g = heatSvg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
    const x = d3.scaleBand().domain(fields).range([0, width]).padding(0.1);
    const y = d3.scaleBand().domain(genres).range([0, height]).padding(0.1);
    const color = d3.scaleSequential(d3.interpolateOrRd).domain([0, 10]);
  
    g.append("g")
      .call(d3.axisLeft(y));
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));
  
    g.selectAll("rect")
      .data(heatmapData)
      .enter()
      .append("rect")
      .attr("x", d => x(d.field))
      .attr("y", d => y(d.genre))
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .attr("fill", d => color(d.value));
  
    // axis labels
    g.append("text")
      .attr("x", width / 2)
      .attr("y", height + 40) // below the x axis
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .text("Mental Health Issue");
  

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -margin.left + 30) // to the left of the y axis
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .text("Favorite Genre");
  
    // heatmap legend
    const legendWidth = 700, legendHeight = 20;
    const legendSvg = d3.select("#heatmap-legend")
      .html("")
      .append("svg")
      .attr("width", 750)
      .attr("height", 80);
  
    const defs = legendSvg.append("defs");
    const linearGradient = defs.append("linearGradient")
      .attr("id", "heatmap-gradient");
  
    linearGradient.selectAll("stop")
      .data(d3.range(0, 1.01, 0.01))
      .enter().append("stop")
      .attr("offset", d => d)
      .attr("stop-color", d => d3.interpolateOrRd(d));
  
    legendSvg.append("rect")
      .attr("x", 20)
      .attr("y", 20)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("fill", "url(#heatmap-gradient)");
  
    const legendScale = d3.scaleLinear().domain([0, 10]).range([0, legendWidth]);
    const legendAxis = d3.axisBottom(legendScale).ticks(6);
  
    legendSvg.append("g")
      .attr("transform", `translate(20,${20 + legendHeight})`)
      .call(legendAxis)
      .selectAll("text")
      .style("font-size", "16px");
  
    legendSvg.append("text")
      .attr("x", legendWidth / 2 + 20)
      .attr("y", 15)
      .attr("text-anchor", "middle")
      .attr("font-size", "18px")
      .text("Average Severity (0-10)");
  
    // scatter plot
    const scatterSvg = d3.select("#scatter"),
          scatterMargin = { top: 20, right: 30, bottom: 40, left: 50 },
          sw = +scatterSvg.attr("width") - scatterMargin.left - scatterMargin.right,
          sh = +scatterSvg.attr("height") - scatterMargin.top - scatterMargin.bottom;
  
    const scatterG = scatterSvg.append("g")
      .attr("transform", `translate(${scatterMargin.left},${scatterMargin.top})`);
  
    const xAge = d3.scaleLinear().domain(d3.extent(data, d => +d.Age)).range([0, sw]);
    const yAnxiety = d3.scaleLinear().domain([0, 10]).range([sh, 0]);
    const genreColor = d3.scaleOrdinal(d3.schemeTableau10).domain(genres);
  
    scatterG.append("g")
      .attr("transform", `translate(0,${sh})`)
      .call(d3.axisBottom(xAge));
    scatterG.append("g")
      .call(d3.axisLeft(yAnxiety));
  
    scatterG.selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", d => xAge(+d.Age))
      .attr("cy", d => yAnxiety(+d.Anxiety))
      .attr("r", 4)
      .attr("fill", d => genreColor(d["Fav genre"]))
      .attr("opacity", 0.7);
  
    // axis labels
    scatterG.append("text")
      .attr("x", sw / 2)
      .attr("y", sh + 35)
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .text("Age");
  
    scatterG.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -sh / 2)
      .attr("y", -scatterMargin.left + 15)
      .attr("text-anchor", "middle")
      .attr("font-size", "14px")
      .text("Anxiety Score (0-10)");
  
    // scatter plot legend
    const legendRectSize = 22;
    const legendSpacing = 10;
    const scatterLegend = d3.select("#scatter-legend")
      .html("")
      .append("svg")
      .attr("width", 250)
      .attr("height", genres.length * (legendRectSize + legendSpacing) + 20);
  
    const legendItem = scatterLegend.selectAll("g")
      .data(genres)
      .enter().append("g")
      .attr("transform", (d, i) => `translate(0,${i * (legendRectSize + legendSpacing) + 10})`);
  
    legendItem.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", legendRectSize)
      .attr("height", legendRectSize)
      .attr("fill", d => genreColor(d));
  
    legendItem.append("text")
      .attr("x", legendRectSize + 10)
      .attr("y", legendRectSize - 5)
      .attr("font-size", "18px")
      .text(d => d);
  
    // sankey chart
    const sankeyRaw = data.map(d => {
      const scores = {
        "Anxiety": +d.Anxiety,
        "Depression": +d.Depression,
        "Insomnia": +d.Insomnia,
        "OCD": +d.OCD
      };
      // if its nan go back to anxiety
      const maxIssue = Object.entries(scores)
        .filter(([k, v]) => !isNaN(v))
        .sort((a, b) => b[1] - a[1])[0]?.[0] || "Anxiety";
      return {
        source: d["Fav genre"],
        target: maxIssue
      };
    });
  
    const sankeyCounts = {};
    sankeyRaw.forEach(d => {
      const key = `${d.source}|${d.target}`;
      sankeyCounts[key] = (sankeyCounts[key] || 0) + 1;
    });
  
    const nodes = [];
    const nodeMap = new Map();
    let index = 0;
  
    Object.keys(sankeyCounts).forEach(key => {
      const [source, target] = key.split("|");
      [source, target].forEach(name => {
        if (!nodeMap.has(name)) {
          nodeMap.set(name, index++);
          nodes.push({ name });
        }
      });
    });
  
    const links = Object.entries(sankeyCounts).map(([key, value]) => {
      const [source, target] = key.split("|");
      return {
        source: nodeMap.get(source),
        target: nodeMap.get(target),
        value
      };
    });
  
    const genreSet = new Set(data.map(d => d["Fav genre"]));
    const issueSet = new Set(["Anxiety", "Depression", "Insomnia", "OCD"]);
  
    // color scales
    const nodeColor = d => genreSet.has(d.name) ? "#1f77b4" : "#ff7f0e";
    const linkColor = d => d3.interpolateOrRd(d.value / d3.max(links, l => l.value));
  
    const sankeySvg = d3.select("#sankey")
      .attr("viewBox", [0, 0, 1000, 500])
      .attr("preserveAspectRatio", "xMidYMid meet");
  
    const sankeyG = sankeySvg.append("g");
  
    const sankeyLayout = d3.sankey()
      .nodeWidth(15)
      .nodePadding(10)
      .extent([[0, 0], [1000, 500]]);
  
    const sankeyGraph = sankeyLayout({
      nodes: nodes.map(d => Object.assign({}, d)),
      links: links.map(d => Object.assign({}, d))
    });
  
    // draw links first (so nodes are on top)
    sankeyG.append("g")
      .attr("class", "links")
      .selectAll("path")
      .data(sankeyGraph.links)
      .enter().append("path")
      .attr("d", d3.sankeyLinkHorizontal())
      .attr("stroke", linkColor)
      .attr("stroke-width", d => Math.max(1, d.width))
      .attr("fill", "none")
      .attr("opacity", 0.5);
  
    // draw nodes
    sankeyG.append("g")
      .attr("class", "nodes")
      .selectAll("rect")
      .data(sankeyGraph.nodes)
      .enter().append("rect")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("height", d => d.y1 - d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("fill", nodeColor)
      .attr("stroke", "#333");
  
    // node label (left for sources, right for targets)
    sankeyG.append("g")
      .attr("class", "labels")
      .selectAll("text")
      .data(sankeyGraph.nodes)
      .enter().append("text")
      .attr("x", d => genreSet.has(d.name) ? d.x0 - 6 : d.x1 + 6)
      .attr("y", d => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", d => genreSet.has(d.name) ? "end" : "start")
      .text(d => d.name)
      .style("font-size", "14px");
  
    // legend (node color) 
    const sankeyLegend = d3.select("#sankey-legend")
      .html("") 
      .append("svg")
      .attr("width", 800)
      .attr("height", 60);
  
    const rectW = 30, rectH = 30;
  
    sankeyLegend.append("rect")
      .attr("x", 0)
      .attr("y", 15)
      .attr("width", rectW)
      .attr("height", rectH)
      .attr("fill", "#1f77b4");
    sankeyLegend.append("text")
      .attr("x", rectW + 10)
      .attr("y", 35)
      .attr("font-size", "20px")
      .text("Genre");
  
    sankeyLegend.append("rect")
      .attr("x", 180)
      .attr("y", 15)
      .attr("width", rectW)
      .attr("height", rectH)
      .attr("fill", "#ff7f0e");
    sankeyLegend.append("text")
      .attr("x", 180 + rectW + 10)
      .attr("y", 35)
      .attr("font-size", "20px")
      .text("Mental Health Issue");
  
    sankeyLegend.append("text")
      .attr("x", 400)
      .attr("y", 35)
      .attr("font-size", "20px")
      .text("Link width = # of people");
  });
  