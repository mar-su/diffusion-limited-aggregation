var w = 1100, h = 1100, pad = 50; // defining width w and height h of the SVG element; and a little padding pad for the plot
var N = 500; // number of particles N


var birthRadius = 1.0; // radius of the circle, where a new particle start its random walk
var killRadius = 5.0; // radius of the circle, where the random walk of a particle is aborted
var squaredKillRadius = killRadius * killRadius;
var maxRadius = -1.0; // radius of farest point
var pointRadius = 1.0; // radius of particle

var dimensionStep = 2.0 * pointRadius; // determines how big the step in each direction can be done in the random walk

var svg = d3.select("#dla") // Select the plot element from the DOM
    .append("svg") // Append an SVG element to it
    .attr("height", h)
    .attr("width", w);


var t0 = performance.now();

var cluster = [];

// distance metric
// be careful: to avoid computational complexity no sqrt() is done. This returns the squared distance!
var distance = function(a, b){
  return Math.pow(a.x - b.x, 2) +  Math.pow(a.y - b.y, 2);
}

// use a kdTree to reduce computational complexity at collision detection
var tree = new kdTree([], distance, ["x", "y"]);

// initial point
cluster.push({x: 0, y: 0, r: pointRadius})
tree.insert({x: 0, y: 0, r: pointRadius});

for (i = 1; i < N; i++) {
    var point = randomWalk()

    console.log("resulting point:");
    console.log(point);
    if(isNaN(point.x) && isNaN(point.y)) {
      console.log("########### Error")
      d3.select("dla").append("p").text("Error!");
      break;
    }

    updateRadii(point)
    point.r = pointRadius; //radius

    console.log("Point " + i + ":");
    console.log(point)
    cluster.push(point);
    tree.insert(point);

    // from time to time rebuilding the tree help to keep the balanceFactor low
    if( i > 100 && tree.balanceFactor() > 1.7) {
      console.log("rebalancing.. balanceFactor: " + tree.balanceFactor() );
      tree = new kdTree(cluster, distance, ["x", "y"]);
    }
}

draw();

/*/ Scales
var xMin = d3.min(cluster, function(d) { return d.x; }), xMax = d3.max(cluster, function(d) { return d.x; });
var xScale = d3.scaleLinear() // For the X axis
    .domain([xMin, xMax])
    .range([pad, w - pad]);

var yMin = d3.min(cluster, function(d) { return d.y; }), yMax = d3.max(cluster, function(d) { return d.y; });
var yScale = d3.scaleLinear() // For the Y axis
    .domain([yMin, yMax])
    .range([pad, h - pad]);

var bestScale;
if( xMax - xMin > yMax - yMin ) {
  bestScale = d3.scaleLinear() // For the X axis
      .domain([xMin, xMax])
      .range([pad, w - pad]);
} else {
  bestScale = d3.scaleLinear() // For the Y axis
      .domain([yMin, yMax])
      .range([pad, h - pad]);
}

var rScale = d3.scaleLinear() // Custom scale for the radii
    .domain([0, d3.max(cluster, function(d) { return d.r; })])
    .range([1, 5]); // Custom range, change it to see the effects!

    */

function draw(){
  svg.selectAll("circle") // Returns ALL matching elements
    .data(cluster) // Bind data to DOM
    .enter() // Add one circle per such data point
    .append("circle")
    .attr("cx", function(d) { return /*bestScale(*/d.x * 5 + w/2/*)*/; })
    .attr("cy", function(d) { return /*bestScale(*/d.y * 5 + h/2/*)*/; })
    .attr("r", function(d) { return /*rScale(*/d.r * 5/*)*/; })
    .attr("class", "dot");
}

var t1 = performance.now();

console.log("Simulation took " + (t1 - t0) / 1000.0 + " seconds.")

function moveRandom(point){
    var range = 2.0 * dimensionStep;
    return { x: point.x + ( Math.random() - 0.5 ) * range, y: point.y + ( Math.random() - 0.5 ) * range };
}

function randomWalk(){
    console.log("start random walk")
    var point = {x: 0, y: 0};
    var oldPoint;
    var nearestPoint = {}
    var collided = false;
    var epsilon = 0.01;
    do{
      oldPoint = point
      // start with random point on circle with birthRadius
      var angle = Math.random() * 2.0 * Math.PI;
      point = { x: birthRadius * Math.cos(angle), y: birthRadius * Math.sin(angle)};

      //walk until collision or death
      var dead = false;
      do{
        oldPoint = point
        point = moveRandom(point)
        dead = isDead(point)
        nearestPoint = getNearestPoint(point, tree);
        collided = nearestPoint.distance + epsilon < 4.0 * pointRadius * pointRadius;
        //collisionPoint.length > 0 && collisionPoint[0][1] < 4.0 * pointRadius * pointRadius;
      }while(!dead && !collided)
    }while(!collided)
    console.log("end random walk")

    // adjust particles, such that they are slightly touching
    for(var i = 0; i < 100 && collided; i++){
      if( i > 0 )
        console.log("there is still a collision");

      point = correctPosition(point, oldPoint, nearestPoint.point);
      // check if there is still a collision

      nearestPoint = getNearestPoint(point, tree);
      collided = nearestPoint.distance + epsilon < 4.0 * pointRadius * pointRadius;
    }

    return point;
}

function isDead(walkingPoint){
    if (Math.pow(walkingPoint.x, 2) + Math.pow(walkingPoint.y, 2) > squaredKillRadius) {
        console.log("death");
        return true;
    } else {
        return false;
    }
}

function updateRadii(newPoint){
    var squaredRadius = Math.pow(0.0 - newPoint.x, 2) + Math.pow(0.0 - newPoint.y, 2);
    var radius = Math.sqrt(squaredRadius);
    console.log("new radius: " + radius)
    console.log("maxRadius: " + maxRadius)
    maxRadius = Math.max(maxRadius, radius);
    birthRadius = maxRadius + 1.0;
    killRadius = birthRadius * 5.0;
    squaredKillRadius = killRadius * killRadius;
}

function getNearestPoint(point, tree){
  var minDistance = Number.MAX_VALUE;
  var nearestPoint = {};

  var points = tree.nearest(point, 1, [4.0 * pointRadius * pointRadius])

  for(var i = 0; i < points.length; i++){
    var distance_ = distance(point, points[i]);
    if(points[i][1] < minDistance){
      minDistance = points[i][1];
      nearestPoint = points[i][0];
    }
  }

  return {point: nearestPoint, distance: minDistance};
}

function correctPosition(w, o, k){

    // w = walking point
    // o = old point (previous walking point)
    // k = collision point

    // 2 * r = sqrt((x-u)² + (y - (m * x + t))²)
    // 2 * r = sqrt((u-x)² + (v - (m * x + t))²)

/*
    console.log("----- input correctPosition")
    console.log(w);
    console.log(o);
    console.log(k);
    console.log("-----");
    console.log("distance between w and k: " + distance(w, k));
*/

    var x = w.x;
    var y = w.y;
    var u = k.x;
    var v = k.y;
//    var p = o.x;
//    var q = o.y;

/*
        console.log(x)
        console.log(y)
        console.log(u)
        console.log(v)
*/
    var m = ( w.y - o.y ) / ( w.x - o.x );
    var t = (-1.0) * m * o.x + o.y;
    var a;
    var b;
    var c;
    var d;
    var r = pointRadius;
/*
        console.log("m,t,t,r:")
        console.log(m);
        console.log(t)
        console.log(w.y - m * w.x);
        console.log(r);
//*/
    if (Math.abs(w.y - m * w.x - t) > 0.000001){
      console.log("*** outch different values for t")
    }


    a = 1 + Math.pow(m, 2.0);
    b = 2.0 * ( - u  + m * t  - m * v );

    c = Math.pow(u, 2.0) - 2.0 * t * v + Math.pow(t, 2.0) + Math.pow(v, 2.0) - 4.0 * Math.pow(r, 2.0);
    d = Math.pow(b, 2.0) - 4.0 * a * c;

/*
    console.log(a)
    console.log(b)
    console.log(c)
    console.log(d)
*/

    if( d < 0.0 ){
      console.log("########### Error")
      console.log("D < 0 !")
      console.log(d)
    }

    var x1 = ( (-1.0) * b + Math.sqrt(d) ) / ( 2.0 * a ),
        x2 = ( (-1.0) * b - Math.sqrt(d) ) / ( 2.0 * a );

    var y1 = m * x1 + t;
    var y2 = m * x2 + t;

    var d1 = Math.pow( x1 - o.x, 2.0) + Math.pow( y1 - o.y, 2.0);
    var d2 = Math.pow( x2 - o.x, 2.0) + Math.pow( y2 - o.y, 2.0);

    if ( d1 < d2 ){
        console.log([x1 - x, y1 - y])
        console.log(w)
        console.log({x: x1, y: y1})
        return {x: x1, y: y1, r: -1}
    } else {
        console.log([x2 - x, y2 - y])
        console.log(w)
        console.log({x: x2, y: y2})
        return {x: x2, y: y2, r: -1}
    }
}
function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
