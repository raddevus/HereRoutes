var tripButton = document.querySelector("#tripButton");
var routeButton = document.querySelector("#routeButton");
var waypointButton = document.querySelector("#waypointButton");
var fromTextInput = document.querySelector("#start");
var destTextInput = document.querySelector("#dest");
var removeFromButton = document.querySelector("#removeFromButton");
var removeDestButton = document.querySelector("#removeDestButton");
var routeInstructionsContainer = document.querySelector("#panel");
routeInstructionsContainer.innerHTML = '';

var calcRouteCounter = 0; 
var group = null;
var router = null;
var routeRequestParams = null;
var tripPoints = [];
var allWaypoints = [];
var allRoutePoints = [];
var allRouteDistancesKm = [];
var allRouteDistancesMi = [];
var allRouteDurations = [];
var allMarkers = [];
var locationsToAdd = [];

function initializeValues(){
  calcRouteCounter = 0; 
  group = null;
  router = null;
  routeRequestParams = null;
  tripPoints = [];
  allWaypoints = [];
  allRoutePoints = [];
  allRouteDistancesKm = [];
  allRouteDistancesMi = [];
  allRouteDurations = [];
  allMarkers = [];
  locationsToAdd = [];
}

ui.setUnitSystem(H.ui.UnitSystem.IMPERIAL);

tripButton.onclick = () => {
  initializeValues();
  var platform = new H.service.Platform({
      'apikey': YOUR_API_KEY
    });
  
  // Get an instance of the geocoding service:
  var service = platform.getSearchService();
  tripPoints = [];
  if (fromTextInput.value != ""){
    locationsToAdd.push(fromTextInput.value);
  }
  if (destTextInput.value != ""){
    locationsToAdd.push(destTextInput.value);
  }
  addMapMarkers(service,locationsToAdd,tripPoints);
}

routeButton.onclick = () => {
  if (tripPoints.length < 2){
    alert("Please add a trip (From & To trip points) first.");
    return;
  }
  // 1. create temp array with all locations and waypoints
  allRoutePoints = [];
  
  // move index 1 (2nd item) to end of array
  var finalDestination = allMarkers.splice(1,1)[0];
  allMarkers.push(finalDestination);
  
  // tripPoints[0] is start of journey
  allRoutePoints.push(tripPoints[0]);
  
  for (var i = 0;i < allWaypoints.length;i++){
    allRoutePoints.push(allWaypoints[i]);
  }

  // tripPoints[1] is destination
  allRoutePoints.push(tripPoints[1]);
  
  calcRouteCounter = 0;
  calcRoute();
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
  if (destTextInput.value.trim() == ""){
    alert("Please add a waypoint destination value.");
    // insures the input is blank (in case user added spaces)
    destTextInput.value = "";
    destTextInput.focus();
    return;
  }
  var platform = new H.service.Platform({
    'apikey': YOUR_API_KEY
  });

  // Get an instance of the geocoding service:
  var service = platform.getSearchService();
  
  addMapMarkers(service,[destTextInput.value],allWaypoints);
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
  fetch(waypointQuery)
  .then(response => response.json())
  .then(data => {
    console.log(data);
    calculateDistanceAndTimeFromWaypointData(data.results[0]);
  });
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
  return waypointString;
}


function addMapMarkers(service, locationsToSearchArray, targetArray){
  // Call the geocode method with the geocoding parameters,
  // the callback and an error callback function (called if a
  // communication error occurs):
  var searchText = locationsToSearchArray[0];
  if (locationsToSearchArray.length > 0){
    service.geocode({
      q: searchText
    }, (result) => {
      // Add a marker for each location found
      var item = result.items[0];
      console.log(item);
      targetArray.push(item);
      var cityName = item.title.split(",")[0] + " " + item.title.split(",")[1];
      var html = "<div>" + cityName + "</div>";
      var marker = new H.map.Marker(item.position)
      allMarkers.push(marker);
      group = new H.map.Group();
      map.addObject(group);
      addInfoBubble(marker,html);
      locationsToSearchArray.shift(0);
      addMapMarkers(service,locationsToSearchArray,targetArray);
    }, alert);
  }
  else{
    // we are done.
    return;
  }
}

function addMarkerToGroup(marker, html) {
    // add custom data to the marker
    marker.setData(html);
    group.addObject(marker);
  }

  function addInfoBubble(marker,html) {
    // add 'tap' event listener, that opens info bubble, to the group
    group.addEventListener('tap', function (evt) {
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

  function calcRoute(){
    console.log("#######");
    router = platform.getRoutingService(null,8),
      routeRequestParams = {
        routingMode: 'fast',
        transportMode: 'car',
        origin: allRoutePoints[calcRouteCounter].position.lat+","+allRoutePoints[calcRouteCounter].position.lng, 
        destination: allRoutePoints[calcRouteCounter+1].position.lat+","+allRoutePoints[calcRouteCounter+1].position.lng,
        return: 'polyline,turnByTurnActions,actions,instructions,travelSummary'
      };
    

    router.calculateRoute(
        routeRequestParams,
        onSuccess,
        onError
    );
  }

  function onSuccess(result) {
      
    var route = result.routes[0];
    console.log(" ###**** ##### ADDING ROUTE ##### ");
    console.log(route);
    addRouteShapeToMap(route);
    addManueversToPanel(route);
    calcRouteCounter++;
    if (calcRouteCounter < allRoutePoints.length-1){
      calcRoute();
    }
  }

  function UpdateMapMarkersWithDistanceAndTimeData(){
    // Update Map Markers with Distance & Time Data
    for (var i = 0;i<allMarkers.length;i++){
      // add special trip totals header, only once
      var msg = "";
      if (i == 0){
        msg = "<div><strong>Trip Totals</strong></div>";
      }
      msg += "<div>" + allRouteDistancesMi[i] + "mi</div>";
      msg += "<div>" + allRouteDurations[i] + "</div>" + allMarkers[i].data;
      console.log(msg);
      allMarkers[i].setData(msg);
    }
  }

  function calculateDistanceAndTimeFromWaypointData(waypointData){
    // ## Determining Total Distance & Time of Trip  ###
    var kilometers = waypointData.distance / 1000;
    allRouteDistancesKm.push(kilometers);
    var miles = (kilometers * 0.6213712).toFixed(2);
    var hours = Math.trunc(waypointData.time / 3600);
    var minutes = Math.trunc((("." + ((waypointData.time  / 3600).toString().split(".")[1]))*1)*60);
    allRouteDistancesMi.push(miles);
    allRouteDurations.push(hours +"h  " + minutes+"m  ");
    // ## Determining Each Leg Distance & Time #####
    waypointData.interconnections.forEach(item => {
      console.log("******");
      kilometers = item.distance / 1000;
      allRouteDistancesKm.push(kilometers);
      miles = (kilometers * 0.6213712).toFixed(2);
      hours = Math.trunc(item.time / 3600); 
      console.log((item.time / 3600).toString());
      minutes = Math.trunc((("." + ((item.time / 3600).toString().split(".")[1]))*1)*60);
      allRouteDistancesMi.push(miles);
      var msg = "travel distance - " + kilometers + "km (" + miles +"mi)";
      allRouteDurations.push(hours +"h  " + minutes+"m  ");
      console.log(msg);
    });
    UpdateMapMarkersWithDistanceAndTimeData();
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