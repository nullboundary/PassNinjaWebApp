(function(tk, pb, $, undefined) {

  'use strict';

  var map,
    locKeys = ['altitude', 'latitude', 'longitude', 'relevantText'],
    beaconKeys = ['proximityUUID', 'major', 'minor', 'relevantText'],
    editRow;

  /***********************************************************


   ***********************************************************/
  function init() {

    initMap();
    //setup date picker
    $('#time-date').datetimepicker({
      timepicker: true,
      formatTimeScroller: 'g:i A' /*uppercase AM/PM now*/ ,
      step: 15,
    });

    //add handler for delete location button
    d3.select('button#btn-del-loc')
      .on('click', onDelLoc);

    //add handler for add location button
    d3.select('button#btn-update-loc')
      .on('click', onUpdateLoc);

    d3.select('input#loc-relevant')
      .on('input', onUpdateLoc);

    d3.select('input#loc-latlong')
      .on('input', onUpdateLoc);

    //add handler for add location button
    d3.select('button#btn-add-loc')
      .on('click', onNewLoc);

    //add handler for delete beacon button
    d3.select('button#btn-del-beacon')
      .on('click', onDelBeacon);

    //add handler for add beacon button
    d3.select('button#btn-add-beacon')
      .on('click', onAddBeacon);

    d3.select('input#beacon-relevant')
      .on('input', onUpdateBeacon);

    d3.select('input#beacon-uuid')
      .on('input', onUpdateBeacon);

    d3.select('input#beacon-major')
      .on('input', onUpdateBeacon);

    d3.select('input#beacon-minor')
      .on('input', onUpdateBeacon);

    //add handler for delete time button
    d3.select('button#btn-del-time')
      .on('click', onDelTime);

    //add handler for set time button
    d3.select('button#btn-add-time')
      .on('click', onSetTime);

    d3.select('table#time-table tr')
      .on('click', onSelectRow);


    d3.selectAll('input[name=loc-tabs]')
      .on('click', onLocTabChange);

  }

  /***********************************************************


   ***********************************************************/
  function initMap() {

      console.warn(map);

      console.log('init Map');

      map = L.map('loc-map').setView([51.505, -0.09], 16); //default to london

      var CartoDB_Positron = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
        subdomains: 'abcd',
        minZoom: 0,
        maxZoom: 18
      }).addTo(map);

      /* toolserver.org is down. Can't find new link.
      var OpenStreetMap_BlackAndWhite = L.tileLayer('http://{s}.www.toolserver.org/tiles/bw-mapnik/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http: //openstreetmap.org">OpenStreetMap</a>',
        detectRetina: true,
        maxZoom: 16
      }).addTo(map);*/

      // create the geocoding control and add it to the map
      var geocode = new L.Control.GeoSearch({
        provider: new L.GeoSearch.Provider.Google(),
        position: 'topright',
        showMarker: false,
      }).addTo(map);

      //set geoencoder search box placeholder text and disable
      d3.select('leaflet-control-geosearch-qry')
        .property('placeholder', 'search address')
        .call(tk.disable);

      //try to use browser location to set map
      map.locate({
        setView: true,
        maxZoom: 16
      });

      map.on('geosearch_foundlocations', function(e) {


        console.log(e.Locations[0]);
        var lng = e.Locations[0].X;
        var lat = e.Locations[0].Y;

        var inputLoc = d3.select('input#loc-latlong')
          .property('value', lat + ',' + lng);

        inputLoc.each(onUpdateLoc);
      });

    }
    /***********************************************************


     ***********************************************************/
  function updateTables() {

    updateTable('locations', 'loc-table', locKeys);
    updateTable('beacons', 'beacon-table', beaconKeys);
    selectRow();
  }

  /***********************************************************


   ***********************************************************/
  function onMapClick(e) {

    var inputLoc = d3.select('input#loc-latlong')
      .property('value', e.latlng.lat + ',' + e.latlng.lng);

    inputLoc.each(onUpdateLoc);

  }



  /***********************************************************


   ***********************************************************/
  function onDelLoc() {

    console.log(this);

    if (d3.event) {
      d3.event.preventDefault();
      d3.event.stopPropagation();
    }


    var row = d3.select('table#loc-table').select('tr.select'),
      index = row.node().rowIndex - 1,
      locations = pb.template().keyDoc.locations,
      data = row.data()[0];

    locations.splice(index, 1); //remove this row from location array

    if (data.marker) {
      map.removeLayer(data.marker);
    }

    setLocRowOnDel(row, locations.length, index);

  }

  /***********************************************************


   ***********************************************************/
  function onUpdateLoc() {


    if (d3.event) {
      d3.event.preventDefault();
      d3.event.stopPropagation();
    }



    var row = d3.select('table#loc-table').select('tr.select'),
      index = row.node().rowIndex - 1,
      locations = pb.template().keyDoc.locations;

    var inputElm = d3.select(this);
    var inputVal = inputElm.node().value;

    var inputId = inputElm.attr('id');

    if (inputId == 'loc-latlong') {

      var latlongArray = inputVal.split(',');
      locations[index].latitude = parseFloat(latlongArray[0]);
      locations[index].longitude = parseFloat(latlongArray[1]);

    } else if (inputId == 'loc-relevant') {

      locations[index].relevantText = inputVal;

    } else if (inputId == 'loc-altitude') {

      locations[index].altitude = parseFloat(inputVal);
    }

    fadePass();

    updateTable('locations', 'loc-table', locKeys);
  }

  /***********************************************************


   ***********************************************************/
  function onNewLoc() {

    if (d3.event) {
      d3.event.preventDefault();
      d3.event.stopPropagation();
    }

    var locations;
    locations = defineOrGet(locations, 'locations');

    var locData = {};

    locations.splice(locations.length, 0, locData);

    fadePass();

    //enable/clear setting panel
    enableLoc();

    clearSelected(); //remove previous select classes
    updateTable('locations', 'loc-table', locKeys);
    selectRow();
  }

  /***********************************************************


   ***********************************************************/
  function updateTable(dataType, tableId, cols) {

      var dataArray = pb.template().keyDoc[dataType];
      if (dataArray != undefined) {

        var table = d3.select('table#' + tableId + ' tbody');
        var row = table.select('tr.select');

        //bind data with dataKey func
        var rows = table.selectAll('tr')
          .data(dataArray, dataKey);

        var enterRows = rows.enter()
          .append('tr')
          .attr('id', function(d, i) {
            return 'index' + i;
          })
          .attr('class', function(d, i) {
            if (this.nextSibling == null) {
              return 'select'; //only set the last new row to select
            }
          });

        // Update cells in existing rows.
        var cells = rows.selectAll('td').data(function(row) {
          return cols.map(function(column) {
            return {
              column: column, //column name for td
              value: row[column] //value for td
            };
          });
        });

        //enter td, add new cells for new data
        cells.enter().append('td')
          .attr('class', function(d, i) {
            return d.column;
          });

        //update and enter td
        cells.text(updateCell);

        cells.exit().remove();

        rows.on('click', onSelectRow);

        //remove exited rows + map marker
        var removed = rows.exit()
          .remove();

        console.log(removed);

      }
    }
    /***********************************************************


     ***********************************************************/
  function fadePass() {

    if (pb.template().keyDoc.beacons != undefined || pb.template().keyDoc.locations != undefined) {

      d3.select('div#settings-content')
        .style('z-index', 1);

      d3.select('.fake-content') //transistion duration applied in css!
        .style('opacity', 0.1);

      d3.transition()
        .duration(1000)
        .delay(10)
        .each(function() {

          d3.select('div#settings-content')
            .transition()
            .style('opacity', 1.0)

        });

    }

  }

  /***********************************************************


   ***********************************************************/
  function showPass() {

      d3.select('.fake-content')
        .style('opacity', 1.0);

      d3.select('div#settings-content')
        .style('opacity', 0)
        .style('z-index', -1);

    }
    /***********************************************************


     ***********************************************************/
  function onSelectRow(d) {

    var selection = d3.select(this);
    clearSelected(); //remove previous selection
    selection.attr('class', 'select'); //set this tr as select

    selectRow();

  }

  /***********************************************************


   ***********************************************************/
  function selectRow() {

    var selection = d3.select('tr.select');

    if (selection.empty()) {
      return;
    }

    var tableId = d3.select(selection.node().offsetParent).attr('id');
    var data = selection.data()[0]; //get bound __data__ from DOM

    if (tableId == 'loc-table') {

      enableLoc();
      d3.select('input#tab1').property('checked', true);
      disableBeacon();

      if (data.altitude) {
        var alt = data.altitude; //TODO: set altitude
      }

      //update lat/long input box
      if (data.latitude) {
        d3.select('input#loc-latlong')
          .property('value', data.latitude + ',' + data.longitude);
      }

      //update map pane
      if (data.marker) {
        map.stopLocate(); //so the map sets to first row rather then user location
        map.panTo(data.marker.getLatLng());
        data.marker.setOpacity(1.0);
      }

      //update relevant input box for loc
      if (!data.proximityUUID && data.relevantText) {
        console.log(data);
        d3.select('input#loc-relevant')
          .property('value', data.relevantText);
      } //TODO: clear value if there is no data in the row!


    } else if (tableId == 'beacon-table') {

      console.log(tableId);
      enableBeacon();
      d3.select('input#tab2').property('checked', true);
      disableLoc();

      //set input value properties
      tk.setValue('input#beacon-uuid', data.proximityUUID);
      tk.setValue('input#beacon-major', data.major);
      tk.setValue('input#beacon-minor', data.minor);

      if (data.proximityUUID && data.relevantText) { //because there are 2 relevantText loc or beacon
        d3.select('input#beacon-relevant')
          .property('value', data.relevantText);
      }



    } else if (tableId == 'time-table') {

      d3.select('input#tab3').property('checked', true);
      disableLoc();
      disableBeacon();

    }



  }

  /***********************************************************


   ***********************************************************/
  function clearSelected() {


    var sRow = d3.select('tr.select');
    console.log('clearSelected');
    console.log(sRow);

    if (!sRow.empty()) {
      var data = sRow.data()[0];
      if (data) {
        if (data.marker) {
          data.marker.setOpacity(0.5);
        }
      }
      sRow.attr('class', null); //remove old select
    }
  }

  /***********************************************************


   ***********************************************************/
  function onDelBeacon() {
    d3.event.preventDefault();

    var row = d3.select('table#beacon-table').select('tr.select'),
      index = row.node().rowIndex - 1,
      beacons = pb.template().keyDoc.beacons,
      data = row.data()[0];

    beacons.splice(index, 1); //remove this row from location array

    setBeaconRowOnDel(row, beacons.length, index);

  }

  /***********************************************************


   ***********************************************************/
  function onAddBeacon() {
    d3.event.preventDefault();

    var beacons;
    beacons = defineOrGet(beacons, 'beacons');

    var beaconData = {};

    beacons.splice(beacons.length, 0, beaconData);

    fadePass();

    //enable/clear setting panel
    enableBeacon();

    clearSelected(); //remove previous select classes
    updateTable('beacons', 'beacon-table', beaconKeys);
    selectRow();
  }

  /***********************************************************


   ***********************************************************/
  function onUpdateBeacon() {

    var row = d3.select('table#beacon-table').select('tr.select'),
      index = row.node().rowIndex - 1,
      beacons = pb.template().keyDoc.beacons;

    var inputElm = d3.select(this);
    var inputVal = inputElm.node().value;

    var inputId = inputElm.attr('id');

    if (inputId === 'beacon-uuid') {

      beacons[index].proximityUUID = inputVal;

    } else if (inputId === 'beacon-major') {

      beacons[index].major = parseInt(inputVal, 10);

    } else if (inputId === 'beacon-minor') {

      beacons[index].minor = parseInt(inputVal, 10);

    } else if (inputId === 'beacon-relevant') {

      beacons[index].relevantText = inputVal;
    }

    fadePass();

    updateTable('beacons', 'beacon-table', beaconKeys);


  }

  /***********************************************************


   ***********************************************************/
  function onDelTime() {
    d3.event.preventDefault();
    var row = d3.select('table#time-table tr').datum(null);
    pb.template().keyDoc.relevantDate = undefined;

    row.select('td')
      .datum(null)
      .text(function(d) { //set text
        return '-';
      });

  }

  /***********************************************************


   ***********************************************************/
  function onSetTime() {
    d3.event.preventDefault();

    //read date/time string
    var dateTimeString = d3.select('input#time-date').node().value;
    var jsDate = new Date(dateTimeString); //create js date

    console.log(jsDate.toISOString());

    //TODO: this format might not work for time.time.
    pb.template().keyDoc.relevantDate = jsDate.toISOString(); //convert to ISO date add to keyDoc

    clearSelected();
    var row = d3.select('table#time-table tr');
    row.data([{
      'time': jsDate
    }]); //bind date as data array

    var cell = row.select('td')
      .text(function(d) { //set text
        return d.time.toLocaleString();
      });

    row.attr('class', 'select'); //set this tr as select
    selectRow();


  }

  /***********************************************************


   ***********************************************************/
  function onLocTabChange() {

    var tabId = d3.select(this).attr('id');

    if (tabId == 'tab1') {
      var row = d3.select('table#loc-table tbody tr');
    } else if (tabId == 'tab2') {
      var row = d3.select('table#beacon-table tbody tr');
    } else if (tabId == 'tab3') {
      var row = d3.select('table#time-table tr');
    }

    console.log(row);

    clearSelected(); //remove previous selection

    if (!row.empty()) {
      row.attr('class', 'select'); //set this tr as select
      selectRow();
    }

  }


  /***********************************************************


   ***********************************************************/
  function enableLoc() {
      map.on('click', onMapClick);
      d3.select('leaflet-control-geosearch-qry').call(tk.enable).property('value', '');
      d3.select('input#loc-latlong').call(tk.enable).property('value', '');
      d3.select('input#loc-relevant').call(tk.enable).property('value', '');
      d3.select('button#btn-del-loc').call(tk.enable);
    }
    /***********************************************************


     ***********************************************************/

  function disableLoc() {
    map.off('click', onMapClick);
    d3.select('leaflet-control-geosearch-qry').call(tk.disable).property('value', '');
    d3.select('input#loc-latlong').call(tk.disable).property('value', '');
    d3.select('input#loc-relevant').call(tk.disable).property('value', '')
    d3.select('button#btn-del-loc').call(tk.disable);
  }

  /***********************************************************


   ***********************************************************/
  function disableBeacon() {

    d3.select('input#beacon-uuid').call(tk.disable).property('value', '');
    d3.select('input#beacon-major').call(tk.disable).property('value', '');
    d3.select('input#beacon-minor').call(tk.disable).property('value', '');
    d3.select('input#beacon-relevant').call(tk.disable).property('value', '');
    d3.select('button#btn-del-beacon').call(tk.disable);
  }

  /***********************************************************


   ***********************************************************/
  function enableBeacon() {
    d3.select('input#beacon-uuid').call(tk.enable).property('value', '');
    d3.select('input#beacon-major').call(tk.enable).property('value', '');
    d3.select('input#beacon-minor').call(tk.enable).property('value', '');
    d3.select('input#beacon-relevant').call(tk.enable).property('value', '');
    d3.select('button#btn-del-beacon').call(tk.enable);
  }

  /***********************************************************


   ***********************************************************/
  function setLocRowOnDel(row, numRows, rowIndex) {


    clearSelected(); //remove previous select classes

    if (numRows > 0) {

      var newSelect;
      newSelect = row;

      if (rowIndex == numRows) { //last element in list
        var newElem = row.node().previousElementSibling;
        newSelect = d3.select(newElem);
      }

      newSelect.attr('class', 'select'); //set this tr as select
      updateTable('locations', 'loc-table', locKeys);
      selectRow();

    } else {
      //disable setting control
      disableLoc();

      updateTable('locations', 'loc-table', locKeys);
    }

  }

  /***********************************************************


   ***********************************************************/
  function setBeaconRowOnDel(row, numRows, rowIndex) {


    clearSelected(); //remove previous select classes

    if (numRows > 0) {

      var newSelect;
      newSelect = row;

      if (rowIndex == numRows) { //last element in list
        var newElem = row.node().previousElementSibling;
        newSelect = d3.select(newElem);
      }

      newSelect.attr('class', 'select'); //set this tr as select
      updateTable('beacons', 'beacon-table', beaconKeys);
      selectRow();

    } else {
      //disable setting control
      disableBeacon();
      updateTable('beacons', 'beacon-table', beaconKeys);
    }



  }


  /***********************************************************
      gets an array if available, if not it creates it

   ***********************************************************/
  function defineOrGet(data, type) {

    if (pb.template().keyDoc[type] == undefined) {
      data = [];
      pb.template().keyDoc[type] = data;
    } else {
      data = pb.template().keyDoc[type];
    }

    return data;
  }

  /***********************************************************


   ***********************************************************/
  function updateCell(d, i) {

    if (typeof d.value === 'number') {
      var floatShorten = d3.format('.6n');
      return floatShorten(d.value) + '...'
    } else {
      return valueOrDefault(d.value, '-');
    }


  }

  /***********************************************************


   ***********************************************************/
  function dataKey(d, i) {

    if (d.marker == undefined && d.latitude) { //don't create if there is no lat/long

      d.marker = L.marker([d.latitude, d.longitude]).addTo(map);

    } else if (d.latitude) {

      d.marker.setLatLng([d.latitude, d.longitude]).update();
    }

    return i; //set bind key as array index (default)

  }

  /***********************************************************
   Tests whether a json field is undefined and if it is not
   sets it to '' or to a default.

   ***********************************************************/
  function valueOrDefault(val, def) {
    if (def == undefined) def = '';
    return val == undefined ? def : val;
  }

  /***********************************************************


  ***********************************************************/
  function onLocationSave() {

    console.log(pb.template().keyDoc.locations);

    //remove marker object from locations array objects
    if (pb.template().keyDoc.locations) {
      var locations = pb.template().keyDoc.locations;
      for (var index in locations) {
        if (locations[index].hasOwnProperty('marker')) {
          delete locations[index].marker;
        }
      }
    }

    var passData = {
      'name': pb.template().name,
      'status': pb.status(pb.location.index()),
      'keyDoc': {
        'locations': pb.template().keyDoc.locations,
        'beacons': pb.template().keyDoc.beacons,
        'maxDistance': parseInt(pb.template().keyDoc.maxDistance, 10),
        'relevantDate': pb.template().keyDoc.relevantDate
      }
    };
    pb.update(pb.template().id, passData);

  }

  //////////////////////////////////////////////////////////////////////////
  //
  // Public Functions
  //
  //
  //////////////////////////////////////////////////////////////////////////

  pb.location = {

    init: function() {
      init();
    },
    update: function() {
      updateTables();
    },
    xray: function(isXray) {
      if (isXray) {
        fadePass();
      } else {
        showPass();
      }
    },
    save: function(index) {
      onLocationSave(index);
    },
    name: function() {
      return 'location';
    },

    index: function() {
      return 10;
    }


  };

}(passNinja.toolkit, passEditor = passNinja.passEditor || {}, jQuery));
