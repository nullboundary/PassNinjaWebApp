(function (app, $, undefined) {

  'use strict';

  //var passBuilder;
  var pageBeforeIndex;
  var pageAfterIndex;
  var passType;
  var passTemplate; //a json object containing all the pass data for this pass

  /***********************************************************


 	***********************************************************/
  function init() {

    passType = 'none';
    //passBuilder = app.passBuilder;
    console.log(app.passBuilder);

    //setup one page scroll
    $('.main').onepage_scroll({
      sectionContainer: 'section',
      updateURL: false,
      responsiveFallback: false,
      pagination: false,
      keyboard: true,
      direction: 'vertical',
      loop: false,
      beforeMove: onBeforeScroll,
      afterMove: onAfterScroll
    });


    //Select PassType
    d3.selectAll('.pass-thumb-select')
      .on('click', onSelectType);

    //Click Next Page Button
    d3.select('#next-button')
      .on('click', onNextPage);

    //prevent enter submit for all forms!
    $('form.pure-form').on("keyup keypress", function (e) {
      var code = e.keyCode || e.which;
      if (code == 13) {
        e.preventDefault();
        return false;
      }
    });

    //only load back if you haven't already
    if (d3.select('svg.back').empty()) {
      app.toolkit.loadSVG('back', onSVGLoad); //load the back svg
    }

  }

  /***********************************************************


 	***********************************************************/
  function onBeforeScroll(index) {

      if (pageBeforeIndex != index) { //prevent handler being called twice per scroll.

        app.passBuilder.colors.resetRectStroke(); //reset all rect stroke to none

        pageBeforeIndex = index;
        console.log('before ' + index);

        for (var key in app.passBuilder) {

          if (app.passBuilder[key].hasOwnProperty('index')) {
            if (app.passBuilder[key].index() + 1 == index) { //match index of object to page scroll page index

              console.log(app.passBuilder[key].name());

              if (app.passBuilder[key].hasOwnProperty('save')) { //save object data to server
                app.passBuilder[key].save(index);
              }

              if (app.passBuilder[key].hasOwnProperty('stroke')) { //change stroke color of rects (some pages)
                app.passBuilder[key].stroke();
              }
            }
          }
        }

      }
    }
    /***********************************************************


 	***********************************************************/
  function onAfterScroll(index) {

    if (pageAfterIndex != index) { //prevent handler being called twice per scroll.
      pageAfterIndex = index;
      console.log('after ' + index);

      for (var key in app.passBuilder) {
        if (app.passBuilder[key].hasOwnProperty('index')) {
          if (app.passBuilder[key].index() == index) { //match index of object to page scroll page index

            console.log('after: ' + app.passBuilder[key].name());

            if (app.passBuilder[key].hasOwnProperty('xray')) {
              app.passBuilder[key].xray(true);
            }
            if (app.passBuilder[key].hasOwnProperty('handler')) {
              app.passBuilder[key].handler();
            }
          }
        }
      }

    }
  }


  /***********************************************************
   buildPass makes a new SVG pass representation from the data

 	***********************************************************/
  function buildPass() {

    //passTemplate
    console.log('passType ' + app.passBuilder.passType());

    app.passBuilder.image.set(); //load images into pass

    app.passBuilder.fields.set(app.passBuilder.template().keyDoc[app.passBuilder.passType()].primaryFields, 'primary');
    app.passBuilder.fields.set(app.passBuilder.template().keyDoc[app.passBuilder.passType()].headerFields, 'header'); //set header fields
    app.passBuilder.fields.set(app.passBuilder.template().keyDoc[app.passBuilder.passType()].secondaryFields, 'second'); //set secondary fields
    app.passBuilder.fields.set(app.passBuilder.template().keyDoc[app.passBuilder.passType()].auxiliaryFields, 'aux'); //set auxiliary fields

    app.passBuilder.fields.setLogo(); //keydoc top level

    app.passBuilder.barcode.set(); //add barcode

    app.passBuilder.colors.updateBg(); //set bg gradiant color
    app.passBuilder.colors.updateText(); //set text color

  }

  /***********************************************************
  initEditor setups up some fields and controls for the pass builder
  tool.

  ***********************************************************/
  function initEditor() {

    buildPass(); //setup template pass

    //set color sliders to match keydoc
    app.passBuilder.colors.updateSliders();
    //set back fields
    app.passBuilder.backFields.set();

    //init all objects
    for (var key in app.passBuilder) {
      if (app.passBuilder[key].hasOwnProperty('init')) {
        app.passBuilder[key].init();
      }
    }

    //setup location data
    app.passBuilder.location.update();

  }

  /***********************************************************


  ***********************************************************/
  function create(jsonData) {

    d3.json('/api/v1/passes/')
      .header("Content-Type", "application/json")
      .header("Authorization", "Bearer " + app.toolkit.getToken())
      .post(JSON.stringify(jsonData), requestHandler);

  }

  /***********************************************************


 	***********************************************************/
  function update(passId, jsonData) {

    d3.json('/api/v1/passes/' + passId)
      .header("Content-Type", "application/json")
      .header("Authorization", "Bearer " + app.toolkit.getToken())
      .send('PATCH', JSON.stringify(jsonData), requestHandler);

  }

  /***********************************************************
    Since both patch and post have the same reply, lets reuse them

  ***********************************************************/
  function requestHandler(error, data) {

    if (error) {
      console.warn(error);
      app.toolkit.alertDisplay('error', error.responseText);
      return;
    }

    console.log(data);
    app.passBuilder.template().id = data.id;
    app.passBuilder.template().updated = data.time;
    app.toolkit.alertDisplay('saved', 'All changes have been successfully saved.');

  }

  /***********************************************************


 	***********************************************************/
  function onNextPage() {
    $('.main').moveDown();
  }

  /***********************************************************


 	***********************************************************/
  function onSelectType() {

    console.log('selectpass');

    var id = d3.select(this).attr('id');
    console.log(id);
    passType = id;

    var svgObj = d3.select('svg');
    if (!svgObj.empty()) {
      console.log('clear pass');
      //passTemplate = null; //clear data
      app.delPassModel(app.getNumPassModel()); //FIXME: sometimes not last?
      d3.select('svg.front').remove();
    }

    var url = '/accounts/template/' + passType;
    var uri = encodeURI(url);
    console.log(uri);
    $('div.spinner').show(); //show spinner

    d3.json(uri)
      .header("Authorization", "Bearer " + app.toolkit.getToken())
      .get(function (error, data) {

        if (error) {
          console.warn(error.statusText);
          app.toolkit.alertDisplay('error', error.statusText);
          return;
        }

        //add data to pass model list and activate it as the current build pass
        console.log(data);
        data.id = ""; //should already be clear
        app.addPassModel(data); //passTemplate = data; //store json pass template object
        app.setPassActive('#front-content', app.getNumPassModel() - 1)
        app.toolkit.loadSVG(passType, onFrontSVGLoad);

        $('div.spinner').hide(); //show spinner
        $('#next-button').show(); //show next arrow

      });
  }

  /***********************************************************

   //callback for load of an svg element check for errors
   ***********************************************************/
  var onSVGLoad = function (error, xml) {

    if (xml != undefined) {
      var svgid = d3.select(xml.documentElement).attr('id');
      if (svgid == 'passBack') {
        d3.select('div#back-content').node().appendChild(xml.documentElement);
      } else {
        d3.select('div#front-content').node().createShadowRoot().appendChild(xml.documentElement);
      }
      return true;
    } else {
      alertDisplay('error', error);
      return false;
    }


  }

  /***********************************************************

   callback for load of the Front SVG element and init the pass
   ***********************************************************/
  var onFrontSVGLoad = function (error, xml) {

    if (onSVGLoad(error, xml)) {
      initEditor();
    }

  }

  /***********************************************************


  ***********************************************************/
  function passStatus(currentPage) {

    if (app.passBuilder.template().status == "ready" || app.passBuilder.template().status == "api") {
      return app.passBuilder.template().status;
    }

    var statusNum = parseInt(app.passBuilder.template().status, 10);
    if (statusNum == NaN) {
      return "0";
    }

    //only set the highest page completion value in the template
    if (statusNum >= currentPage) {
      return app.passBuilder.template().status;
    }
    //all pages have been set, pass should be complete. Share should always be the last page
    if (currentPage >= app.passBuilder.share.index() - 1) {
      if (app.passBuilder.template().mutatelist && app.passBuilder.template().mutatelist.length > 0) { //submit the api mutate variable list if it exists.
        return "api";
      }
      return "ready";
    }

    return (currentPage).toString();

  }


  //////////////////////////////////////////////////////////////////////////
  //
  // Public Functions
  //
  //
  //////////////////////////////////////////////////////////////////////////

  app.passBuilder = {

    init: function () {
      init();
    },

    build: function () {
      buildPass();
    },

    create: function (jsonData) {
      create(jsonData);
    },

    update: function (passId, jsonData) {
      update(passId, jsonData)
    },

    svg: function () {
      return app.getSvgRoot();
    },

    template: function () {
      return app.getPassModel();
    },

    passType: function () {
      return app.getPassModel().passtype;
    },

    status: function (page) {
      return passStatus(page)
    }
  };


}(passNinja = window.passNinja || {}, jQuery));
