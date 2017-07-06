// SETUP MAP
var height = $(window).height();
$('#map').height(height);

var map = L.map('map').setView([51.505, -0.09], 13);

L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

var dataGeoJson= { "type": "featureCollection", "features": [] };
var mapBounds;

var markers = L.markerClusterGroup({
    spiderfyOnMaxZoom: false,
    showCoverageOnHover: false,
    iconCreateFunction: function(cluster) {
      // console.log(cluster.getAllChildMarkers()[0]);
      return new L.DivIcon(L.extend({
        className: 'leaflet-marker-photo',
        html: '<div style="background-image: url(images/maps/' +
        // randomly selects one of the thumbnails from the child markers
        cluster.getAllChildMarkers()[Math.floor(Math.random()*cluster.getAllChildMarkers().length)].feature.properties.spot +
        '_thumb.jpg);"></div>​<b>' + cluster.getChildCount() + '</b>'
      }, this.icon));
      },
    icon: {
      iconSize: [40, 40]
    }
});

// ADD CONTROL FOR ZOOM TO EXTENT
var extentControl = L.Control.extend({
  options: {
    position: 'topleft',
		title: 'Full extent',
    content: '<span class="glyphicon glyphicon-resize-full"></span>'
  },
  onAdd: function (map) {
    var className = 'leaflet-control-zoom-extent', content, container;
    container = map.zoomControl._container;
    content = this.options.content;
    this._createButton(this.options.title, className, content, container, this);
    return container;
  },
  _createButton: function (title, className, content, container, context) {
    this.link = L.DomUtil.create('a', className, container);
    this.link.href = '#';
    this.link.title = title;
    this.link.innerHTML = content;
    return this.link;
  }
});
map.addControl(new extentControl());

// FUNCTION CHAIN TO BUILD PAGE
function getData(){
  d3.csv('data/points.csv', function(rows){
    $(rows).each(function(index, row){
      var latlng = [parseFloat(row.lng), parseFloat(row.lat)];
      var thisGeoJsonObject = {
        "type": "Feature",
        "properties": {
          "municip": row.municip,
          "brgy": row.brgy,
          "spot": row.spot,
          "cap": row.cap,
        },
        "geometry": {
          "type": "Point",
          "coordinates": latlng
        }
      };
      dataGeoJson.features.push(thisGeoJsonObject);
    });
    buildSearchBox(rows);
    mapData();
  });
}

function mapData(){
  marker = L.geoJson(dataGeoJson, {
    pointToLayer: function (feature, latlng) {
      return L.marker(latlng, {
        icon: L.divIcon(L.extend({
          html: '<div style="background-image: url(images/maps/' +
           feature.properties.spot +
           '_thumb.jpg);">'+
          //  '<a class="image-link" href="#" data-lightbox="images/maps/'+
          //  feature.properties.spot + '.jpg" ></a>'+
           '</div>​',
          className: 'leaflet-marker-photo',
          iconSize: [40, 40]
        }))
      });
    },
    onEachFeature: function(feature, layer) {
      layer.on({
        click: markerClick,
        mouseover: displayName,
        mouseout: clearName
      })
    }
  });

  markers.addLayer(marker);
  markers.addTo(map);

  mapBounds = markers.getBounds();
  map.fitBounds(mapBounds);

  buildSearchBox();

}

// Search box
// ==========
function buildSearchBox(data) {
  // constructs the suggestion engine
  var barangays = new Bloodhound({
    datumTokenizer: Bloodhound.tokenizers.obj.whitespace('brgy' , 'municip'),
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    local: data
  });

  // kicks off the loading/processing of `local`
  barangays.initialize();

  $('#search-box .typeahead').typeahead({
    // hint: true,
    highlight: true,
    minLength: 1
  },
  {
    name: 'barangays',
    displayKey: Handlebars.compile('{{brgy}}'),
    source: barangays.ttAdapter(),
    templates: {
      empty:[
        '<div class="empty-message">',
        '<small><i>Unable to find a matching name</i></small>',
        '</div>'
      ].join('\n'),
      suggestion: Handlebars.compile('<p>{{brgy}}, {{municip}}</p>')
    }
  }).on('typeahead:selected', function (eventObj, datum) {
    selectedBarangay(datum);
  });
}

function selectedBarangay(datum) {
  $('#search-box .typeahead').typeahead('val', '');
  var center = L.latLng(datum.lat, datum.lng);
  map.setView(center, 15);
  openModal(datum);
}

// HELPER FUNCTIONS //
// ################ //
function zoomOut() {
    map.fitBounds(mapBounds);
}

function displayName(e) {
  var tooltip = e.target.feature.properties.brgy + ", " + e.target.feature.properties.municip;
  $('#tooltip').html(tooltip);
}

function clearName(e) {
  $('#tooltip').empty();
}

function markerClick(e) {
  // console.log(e.target.feature.properties)
  openModal(e.target.feature.properties);
}
function openModal(barangay) {
  var h = $(window).height()*0.40;

  var spotsrc = "images/maps/" + barangay.spot + ".jpg";
  var visionsrc = "pdf/"+barangay.brgy+"/vision map.jpg";

  var prapdf = "pdf/"+barangay.brgy+"/pra tools.pdf",
      cappdf = "pdf/"+barangay.brgy+"/updated cap.pdf",
      wppdf = "pdf/"+barangay.brgy+"/workplan.jpg",
      drrpdf = "pdf/"+barangay.brgy+"/drr plan.pdf",
      bppdf = "pdf/"+barangay.brgy+"/barangay profile.pdf";


  var alt = barangay.spot;

  $('#spot-map img').css('max-height', h);
  $('#spot-map img').attr('src', spotsrc);
  $('#spot-map img').attr('alt', alt);

  $('#vision-map img').css('max-height', h);
  $('#vision-map img').attr('src', visionsrc);
  $('#vision-map img').attr('alt', alt);

  $('#location').html(barangay.brgy+", "+barangay.municip);

  $('#dl-spot .pdf-download').attr('href', spotsrc);
  $('#dl-vision .pdf-download').attr('href', visionsrc);
  $('#dl-cap .pdf-download').attr('href', cappdf);
  $('#dl-pra .pdf-download').attr('href', prapdf);
  $('#dl-wp .pdf-download').attr('href', wppdf);
  $('#dl-drr .pdf-download').attr('href', drrpdf);
  $('#dl-prof .pdf-download').attr('href', bppdf);

  $('#image-modal').modal('show')
}


// on window resize
$(window).resize(function(){
  height = $(window).height() - $('#logo-bar').height();
  $('#map').height(height);
})

// tooltip follows cursor
$(document).ready(function() {
    $('body').mouseover(function(e) {
        //Set the X and Y axis of the tooltip
        $('#tooltip').css('top', e.pageY + 10 );
        $('#tooltip').css('left', e.pageX + 20 );
    }).mousemove(function(e) {
        //Keep changing the X and Y axis for the tooltip, thus, the tooltip move along with the mouse
        $("#tooltip").css({top:(e.pageY+15)+"px",left:(e.pageX+20)+"px"});
    });
});

$('.leaflet-control-zoom-extent').click(function(){
  zoomOut();
})

// INITIATE FUNCTION CHAIN
getData();
