(function (pb, $, undefined) {

  'use strict';

  var marker;

  function init() {
    configMap();
  }

  function configMap() {

    var map = L.map('loc-map').setView([51.505, -0.09], 13);

    marker = L.marker([0, 0]).addTo(map); //TODO create a new marker when add location is clicked

    //https://github.com/leaflet-extras/leaflet-providers
    var MapQuestOpen_OSM = L.tileLayer('http://otile{s}.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.jpeg', {
      attribution: 'Tiles by <a href="http://www.mapquest.com/">MapQuest</a>',
      subdomains: '1234'
    }).addTo(map);

    //search bar to find lat/long from address
    var osmGeocoder = new L.Control.OSMGeocoder({
      text: 'Locate',
    });
    map.addControl(osmGeocoder);

    //set geoencoder search box placeholder text
    d3.select('.leaflet-control-geocoder-form input')
      .attr('placeholder', 'Your address')
      .style('margin-right', '5px');

    map.locate({
      setView: true,
      maxZoom: 16
    });

    map.on('click', onMapClick);


  }

  function onMapClick(e) {

    marker.setLatLng(e.latlng).update();

    d3.select('input#latlong')
      .attr('value', e.latlng.lat + "," + e.latlng.lng);
  }



  //////////////////////////////////////////////////////////////////////////
  //
  // Public Functions
  //
  //
  //////////////////////////////////////////////////////////////////////////

  pb.location = {

    init: function () {
      init();
    },

    save: function () {

    }

  };

}(passBuilder = window.passBuilder || {}, jQuery));
