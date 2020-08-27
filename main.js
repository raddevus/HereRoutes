var markersButton = document.querySelector("#markersButton");
var routeButton = document.querySelector("#routeButton");
var fromTextInput = document.querySelector("#start");
var destTextInput = document.querySelector("#dest");

console.log(map);
var group = null;
var router = null;
var routeRequestParams = null;
var allLocations = [];

markersButton.onclick = () => {
  var platform = new H.service.Platform({
      'apikey': YOUR_API_KEY
    });
  
  // Get an instance of the geocoding service:
  var service = platform.getSearchService();
  allLocations = [];
  if (fromTextInput.value != ""){
    addMapMarkers(service,fromTextInput.value);
  }
  if (destTextInput.value != ""){
    addMapMarkers(service,destTextInput.value);
  }
}

routeButton.onclick = () => {
  if (allLocations.length < 2){
    console.log("need to set markers first");
    return;
  }
  calcRoute(allLocations[0].position,allLocations[1].position);
}

function addMapMarkers(service, textInputValue){
  // Call the geocode method with the geocoding parameters,
  // the callback and an error callback function (called if a
  // communication error occurs):
  service.geocode({
    q: textInputValue
  }, (result) => {
    // Add a marker for each location found
    result.items.forEach((item) => {
        console.log(item);
        allLocations.push(item);
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
        waypoint0: '38.25489,-85.76666',
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
    allLocations = [];
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

  function addWaypointsToPanel(route) {
    var nodeH3 = document.createElement('h3'),
        labels = [];
  
    route.sections.forEach((section) => {
      labels.push(
        section.turnByTurnActions[0].nextRoad.name[0].value)
      labels.push(
        section.turnByTurnActions[section.turnByTurnActions.length - 1].currentRoad.name[0].value)
    });
    
    nodeH3.textContent = labels.join(' - ');
    routeInstructionsContainer.innerHTML = '';
    routeInstructionsContainer.appendChild(nodeH3);
  }

  function onError(error) {
    alert('Can\'t reach the remote server');
  }