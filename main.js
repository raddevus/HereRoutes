var tripButton = document.querySelector("#tripButton");
var routeButton = document.querySelector("#routeButton");
var waypointButton = document.querySelector("#waypointButton");
var fromTextInput = document.querySelector("#start");
var destTextInput = document.querySelector("#dest");
var removeFromButton = document.querySelector("#removeFromButton");
var removeDestButton = document.querySelector("#removeDestButton");
var routeInstructionsContainer = document.querySelector("#panel");

console.log(map);
var group = null;
var router = null;
var routeRequestParams = null;
var tripPoints = [];
var allWaypoints = [];

tripButton.onclick = () => {
   
  var platform = new H.service.Platform({
      'apikey': YOUR_API_KEY
    });
  
  // Get an instance of the geocoding service:
  var service = platform.getSearchService();
  tripPoints = [];
  if (fromTextInput.value != ""){
    addMapMarkers(service,fromTextInput.value,tripPoints);
  }
  if (destTextInput.value != ""){
    addMapMarkers(service,destTextInput.value,tripPoints);
  }
}

function genRoute(){
  var origin = tripPoints[0].position.lat + "," + tripPoints[0].position.lng;
  var dest = tripPoints[1].position.lat + "," + tripPoints[1].position.lng;
  var finalUrl = 'https://router.hereapi.com/v8/routes?transportMode=car&origin=' + origin + '&destination=' + dest + '&return=polyline,turnByTurnActions,actions,instructions,travelSummary&apikey=' + YOUR_API_KEY;
  console.log(finalUrl);
  fetch(finalUrl)
  .then(response => response.json())
  .then(data => addRouteShapeToMap(data.routes[0]));

}

routeButton.onclick = () => {
  //genRoute(); return;
  if (tripPoints.length < 2){
    console.log("need add start and end (trip points) first");
    return;
  }
  // 1. create temp array with all locations and waypoints
  var allRoutes = [];
  
  // tripPoints[0] is start of journey
  allRoutes.push(tripPoints[0]);
  var waypointRouteCounter = 0;
  
  for (var i = 0;i < allWaypoints.length;i++){
    allRoutes.push(allWaypoints[i]);
  }

  console.log("waypointRouteCounter : " + waypointRouteCounter);
  // tripPoints[1] is destination
  allRoutes.push(tripPoints[1]);

  console.log("allRoutes length : " + allRoutes.length);
  // 2. iterate thru and add each section of the entire route
  for (var i = 0;i < allRoutes.length-1;i++){
    calcRoute(allRoutes[i].position,allRoutes[i+1].position);
  }
  calcWaypoints();

}

removeFromButton.onclick = () => {
  fromTextInput.value = "";
  fromTextInput.focus();
}

removeDestButton.onclick = () => {
  destTextInput.value = "";
  destTextInput.focus();
}

waypointButton.onclick = () =>{
  var platform = new H.service.Platform({
    'apikey': YOUR_API_KEY
  });

  // Get an instance of the geocoding service:
  var service = platform.getSearchService();
  
  addMapMarkers(service,destTextInput.value,allWaypoints);
  destTextInput.value = "";
  destTextInput.focus();
  
}

function calcWaypoints(){
  if (tripPoints.length < 2) {
    console.log("Need at least To & From to calculate path.");
    return;
  }
  var waypointQuery = buildWaypointQueryString();
  console.log(encodeURI(waypointQuery));
}

function buildWaypointQueryString(){
  var waypointString = "https://wse.ls.hereapi.com/2/findsequence.json?apiKey=" + YOUR_API_KEY;
  waypointString += "&start=" + tripPoints[0].address.city + ";" + tripPoints[0].position.lat + "," + tripPoints[0].position.lng;
  
  if (allWaypoints != null && allWaypoints.length > 0){
    for (var j=0;j<allWaypoints.length;j++)
    {
      var tempString = "&destination" + j + "=";
      tempString += allWaypoints[j].address.city + ";";
      tempString += allWaypoints[j].position.lat + ","+allWaypoints[j].position.lng;
      waypointString += tempString;
      console.log(tempString);
    }
  }
  
  waypointString += "&end=" + tripPoints[1].address.city + ";" + tripPoints[1].position.lat + "," + tripPoints[1].position.lng;
  
  waypointString += "&improveFor=distance";
  waypointString += "&mode=fastest;car";  
  // allWaypoints.forEach((w) =>{
  //     console.log(w.address.city);
  //     console.log(w.position.lat);
  //     console.log(w.position.lng);
  //   });
  /* 
  &destination1=FranfurtCentralStation;50.1073,8.6647
  &destination2=DarmstadtCentralStation;49.8728,8.6326
  &destination3=FrankfurtAirport;50.0505,8.5698
  &destination4=HanauCentralStation;50.1218,8.9298
  &end=MainzCentralStation;50.0021,8.259
  &improveFor=time&mode=fastest;car;traffic:enabled; */
  return waypointString;
}


function addMapMarkers(service, textInputValue, targetArray){
  // Call the geocode method with the geocoding parameters,
  // the callback and an error callback function (called if a
  // communication error occurs):
  service.geocode({
    q: textInputValue
  }, (result) => {
    // Add a marker for each location found
    result.items.forEach((item) => {
        console.log(item);
        targetArray.push(item);
        var html = "<div>" + item.title + "</div>";
        var marker = new H.map.Marker(item.position)
        group = new H.map.Group();
        map.addObject(group);
        addInfoBubble(marker,html);
    });
  }, alert);
}

function addMarkerToGroup(marker, html) {
    // add custom data to the marker
    marker.setData(html);
    console.log("setData...");
    group.addObject(marker);
    console.log("added to group");
    
  }

  function addInfoBubble(marker,html) {
    console.log("addInfoBubble...");
    // add 'tap' event listener, that opens info bubble, to the group
    group.addEventListener('tap', function (evt) {
        console.log("tapped");
      // event target is the marker itself, group is a parent event target
      // for all objects that it contains
      var bubble =  new H.ui.InfoBubble(evt.target.getGeometry(), {
        // read custom data
        content: evt.target.getData()
      });
      // show info bubble
      ui.addBubble(bubble);
    }, false);
  
    addMarkerToGroup(marker,html );
  
  }

  function calcRoute(start,end){
      console.log("#######");
      console.log(start);
      console.log(end);
    
    router = platform.getRoutingService(null, 8),
      routeRequestParams = {
        routingMode: 'fast',
        transportMode: 'car',
        origin: start.lat+","+start.lng, 
        destination: end.lat+","+end.lng,
        return: 'polyline,turnByTurnActions,actions,instructions,travelSummary'
      };
    

    router.calculateRoute(
        routeRequestParams,
        onSuccess,
        onError
    );
  
  }

  function onSuccess(result) {
      console.log("******");
      console.log(result);
      var route = result.routes[0];
   /*
    * The styling of the route response on the map is entirely under the developer's control.
    * A representitive styling can be found the full JS + HTML code of this example
    * in the functions below:
    */
    addRouteShapeToMap(route);
    addWaypointsToPanel(route);
    addManueversToPanel(route);
    
    //allLocations = [];
  }

  function addRouteShapeToMap(route){
    route.sections.forEach((section) => {
      // decode LineString from the flexible polyline
      let linestring = H.geo.LineString.fromFlexiblePolyline(section.polyline);
  
      // Create a polyline to display the route:
      let polyline = new H.map.Polyline(linestring, {
        style: {
          lineWidth: 4,
          strokeColor: 'rgba(0, 128, 255, 0.7)'
        }
      });
  
      // Add the polyline to the map
      map.addObject(polyline);
      // And zoom to its bounding rectangle
      map.getViewModel().setLookAtData({
        bounds: polyline.getBoundingBox()
      });
    });
  }

  function addManueversToPanel(route){
    var nodeOL = document.createElement('ol');
  
    nodeOL.style.fontSize = 'small';
    nodeOL.style.marginLeft ='5%';
    nodeOL.style.marginRight ='5%';
    nodeOL.className = 'directions';
  
    route.sections.forEach((section) => {
      console.log("Got route sections...*****")
      section.actions.forEach((action, idx) => {
        var li = document.createElement('li'),
            spanArrow = document.createElement('span'),
            spanInstruction = document.createElement('span');
  
        spanArrow.className = 'arrow ' + (action.direction || '') + action.action;
        spanInstruction.innerHTML = section.actions[idx].instruction;
        li.appendChild(spanArrow);
        li.appendChild(spanInstruction);
  
        nodeOL.appendChild(li);
      });
    });
  
    routeInstructionsContainer.appendChild(nodeOL);
  }

function addWaypointsToPanel(route) {
  var nodeH3 = document.createElement('h3'),
      labels = [];
  console.log("*** addWaypointsToPanel ***");
  route.sections.forEach((section) => {
    //console.log(" ### got a section ###");
    var nextRoadName = section.turnByTurnActions[0].nextRoad.name[0].value;
    labels.push(nextRoadName);
    var currentRoadName = section.turnByTurnActions[section.turnByTurnActions.length - 1].currentRoad.name[0].value;
    labels.push(currentRoadName);
    console.log(nextRoadName);
  console.log(currentRoadName);
    });
  
   nodeH3.textContent = labels.join(' - ');
   routeInstructionsContainer.innerHTML = '';
   routeInstructionsContainer.appendChild(nodeH3);
}

function onError(error) {
  alert('Can\'t reach the remote server');
}